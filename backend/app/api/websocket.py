"""
Seryvo Platform - WebSocket Server
Real-time bidirectional communication for:
- Booking status updates
- Driver location streaming
- Chat messages
- System notifications
"""
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
import json
import asyncio
from enum import Enum
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from jose import jwt, JWTError
from pydantic import BaseModel

from app.core.config import settings


router = APIRouter(prefix="/ws", tags=["WebSocket"])


# =============================================================================
# Enums & Models
# =============================================================================

class ChannelType(str, Enum):
    """WebSocket channel types."""
    BOOKING = "booking"           # Booking status updates
    DRIVER_LOCATION = "driver_location"  # Driver GPS streaming
    CHAT = "chat"                 # Chat messages
    NOTIFICATION = "notification" # System notifications
    ADMIN = "admin"               # Admin dashboard updates


class MessageType(str, Enum):
    """WebSocket message types."""
    # Connection management
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
    
    # Booking events
    BOOKING_CREATED = "booking_created"
    BOOKING_UPDATED = "booking_updated"
    BOOKING_STATUS_CHANGED = "booking_status_changed"
    BOOKING_CANCELLED = "booking_cancelled"
    
    # Driver events
    DRIVER_LOCATION_UPDATE = "driver_location_update"
    DRIVER_STATUS_CHANGED = "driver_status_changed"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_ARRIVED = "driver_arrived"
    
    # Chat events
    CHAT_MESSAGE = "chat_message"
    CHAT_TYPING = "chat_typing"
    CHAT_READ = "chat_read"
    
    # Notification events
    NOTIFICATION_NEW = "notification_new"
    NOTIFICATION_READ = "notification_read"
    
    # Admin events
    ADMIN_STATS_UPDATE = "admin_stats_update"
    NEW_SUPPORT_TICKET = "new_support_ticket"


class WebSocketMessage(BaseModel):
    """Standard WebSocket message format."""
    type: str
    channel: str
    payload: Dict[str, Any]
    timestamp: str
    message_id: str


# =============================================================================
# Connection Manager
# =============================================================================

class ConnectionManager:
    """
    Manages WebSocket connections with support for:
    - User-based connections (one user can have multiple tabs/devices)
    - Channel subscriptions (booking, chat, location, etc.)
    - Room-based messaging (specific booking, chat thread, etc.)
    - Broadcast to all or specific groups
    """
    
    def __init__(self):
        # Active connections: user_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
        # Channel subscriptions: channel -> set of user_ids
        self.channel_subscriptions: Dict[str, Set[str]] = {
            channel.value: set() for channel in ChannelType
        }
        
        # Room subscriptions: room_id -> set of user_ids
        # Rooms are like: "booking:123", "chat:456", "driver:789"
        self.room_subscriptions: Dict[str, Set[str]] = {}
        
        # User metadata: user_id -> {role, connected_at, etc.}
        self.user_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    async def connect(
        self, 
        websocket: WebSocket, 
        user_id: str,
        user_role: str
    ) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
                self.user_metadata[user_id] = {
                    "role": user_role,
                    "connected_at": datetime.utcnow().isoformat(),
                    "connection_count": 0
                }
            
            self.active_connections[user_id].append(websocket)
            self.user_metadata[user_id]["connection_count"] += 1
        
        # Send connection acknowledgment
        await self.send_personal_message(
            user_id,
            websocket,
            self._create_message(
                MessageType.CONNECT,
                ChannelType.NOTIFICATION,
                {"status": "connected", "user_id": user_id}
            )
        )
        
        print(f"WebSocket connected: user={user_id}, role={user_role}")
    
    async def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                    self.user_metadata[user_id]["connection_count"] -= 1
                
                # Clean up if no more connections for this user
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    
                    # Remove from all channels
                    for channel in self.channel_subscriptions.values():
                        channel.discard(user_id)
                    
                    # Remove from all rooms
                    for room in self.room_subscriptions.values():
                        room.discard(user_id)
                    
                    del self.user_metadata[user_id]
        
        print(f"WebSocket disconnected: user={user_id}")
    
    async def subscribe_channel(self, user_id: str, channel: ChannelType) -> None:
        """Subscribe a user to a channel."""
        async with self._lock:
            self.channel_subscriptions[channel.value].add(user_id)
        print(f"User {user_id} subscribed to channel: {channel.value}")
    
    async def unsubscribe_channel(self, user_id: str, channel: ChannelType) -> None:
        """Unsubscribe a user from a channel."""
        async with self._lock:
            self.channel_subscriptions[channel.value].discard(user_id)
        print(f"User {user_id} unsubscribed from channel: {channel.value}")
    
    async def join_room(self, user_id: str, room_id: str) -> None:
        """Join a user to a specific room (e.g., booking:123)."""
        async with self._lock:
            if room_id not in self.room_subscriptions:
                self.room_subscriptions[room_id] = set()
            self.room_subscriptions[room_id].add(user_id)
        print(f"User {user_id} joined room: {room_id}")
    
    async def leave_room(self, user_id: str, room_id: str) -> None:
        """Remove a user from a specific room."""
        async with self._lock:
            if room_id in self.room_subscriptions:
                self.room_subscriptions[room_id].discard(user_id)
                if not self.room_subscriptions[room_id]:
                    del self.room_subscriptions[room_id]
        print(f"User {user_id} left room: {room_id}")
    
    async def send_personal_message(
        self, 
        user_id: str, 
        websocket: WebSocket,
        message: dict
    ) -> None:
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message to {user_id}: {e}")
    
    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Send a message to all connections of a specific user."""
        if user_id in self.active_connections:
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    print(f"Error sending to user {user_id}: {e}")
    
    async def broadcast_channel(
        self, 
        channel: ChannelType, 
        message: dict,
        exclude_user: Optional[str] = None
    ) -> None:
        """Broadcast a message to all users subscribed to a channel."""
        subscribers = self.channel_subscriptions[channel.value].copy()
        
        for user_id in subscribers:
            if user_id != exclude_user:
                await self.send_to_user(user_id, message)
    
    async def broadcast_room(
        self, 
        room_id: str, 
        message: dict,
        exclude_user: Optional[str] = None
    ) -> None:
        """Broadcast a message to all users in a room."""
        if room_id not in self.room_subscriptions:
            return
        
        members = self.room_subscriptions[room_id].copy()
        
        for user_id in members:
            if user_id != exclude_user:
                await self.send_to_user(user_id, message)
    
    async def broadcast_all(
        self, 
        message: dict, 
        exclude_user: Optional[str] = None
    ) -> None:
        """Broadcast a message to all connected users."""
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user:
                await self.send_to_user(user_id, message)
    
    async def broadcast_by_role(
        self, 
        role: str, 
        message: dict,
        exclude_user: Optional[str] = None
    ) -> None:
        """Broadcast a message to all users with a specific role."""
        for user_id, metadata in list(self.user_metadata.items()):
            if metadata.get("role") == role and user_id != exclude_user:
                await self.send_to_user(user_id, message)
    
    def get_online_users(self) -> List[str]:
        """Get list of all online user IDs."""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is online."""
        return user_id in self.active_connections
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return sum(len(conns) for conns in self.active_connections.values())
    
    def _create_message(
        self, 
        msg_type: MessageType, 
        channel: ChannelType,
        payload: dict
    ) -> dict:
        """Create a standard message format."""
        return {
            "type": msg_type.value,
            "channel": channel.value,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
            "message_id": str(uuid4())
        }


# Global connection manager instance
manager = ConnectionManager()


# =============================================================================
# Authentication Helper
# =============================================================================

async def get_token_user(token: str) -> Optional[Dict[str, Any]]:
    """Validate JWT token and extract user info."""
    try:
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        user_id = payload.get("sub")
        # Roles can be a list or single value - get primary role
        roles = payload.get("roles", [])
        if isinstance(roles, list) and roles:
            role = roles[0]  # Primary role is first in list
        elif isinstance(roles, str):
            role = roles
        else:
            role = payload.get("role", "client")
        
        if user_id is None:
            return None
        
        return {"user_id": user_id, "role": role}
    except JWTError:
        return None


# =============================================================================
# WebSocket Endpoints
# =============================================================================

@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Main WebSocket connection endpoint.
    
    Connect with: ws://localhost:8000/ws/connect?token=<JWT_TOKEN>
    
    Message format (send/receive):
    {
        "type": "message_type",
        "channel": "channel_name",
        "payload": { ... },
        "timestamp": "ISO-8601",
        "message_id": "uuid"
    }
    
    Supported actions (send to server):
    - subscribe: {"type": "subscribe", "channel": "booking", "payload": {"room_id": "booking:123"}}
    - unsubscribe: {"type": "unsubscribe", "channel": "booking", "payload": {"room_id": "booking:123"}}
    - ping: {"type": "ping", "payload": {}}
    
    Driver-specific actions:
    - location_update: {"type": "driver_location_update", "channel": "driver_location", "payload": {"lat": ..., "lng": ...}}
    
    Chat actions:
    - chat_message: {"type": "chat_message", "channel": "chat", "payload": {"room_id": "chat:123", "message": "..."}}
    - chat_typing: {"type": "chat_typing", "channel": "chat", "payload": {"room_id": "chat:123", "is_typing": true}}
    """
    # Validate token
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    user_info = await get_token_user(token)
    if not user_info:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    user_id = user_info["user_id"]
    user_role = user_info["role"]
    
    await manager.connect(websocket, user_id, user_role)
    
    # Auto-subscribe to notification channel
    await manager.subscribe_channel(user_id, ChannelType.NOTIFICATION)
    
    # Auto-subscribe based on role
    if user_role == "driver":
        await manager.subscribe_channel(user_id, ChannelType.DRIVER_LOCATION)
    elif user_role == "admin":
        await manager.subscribe_channel(user_id, ChannelType.ADMIN)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            msg_type = data.get("type", "")
            channel = data.get("channel", "")
            payload = data.get("payload", {})
            
            # Handle different message types
            if msg_type == "ping":
                # Respond with pong
                await manager.send_personal_message(
                    user_id,
                    websocket,
                    manager._create_message(
                        MessageType.PONG,
                        ChannelType.NOTIFICATION,
                        {}
                    )
                )
            
            elif msg_type == "subscribe":
                # Subscribe to channel/room
                if channel and channel in [c.value for c in ChannelType]:
                    await manager.subscribe_channel(user_id, ChannelType(channel))
                if "room_id" in payload:
                    await manager.join_room(user_id, payload["room_id"])
            
            elif msg_type == "unsubscribe":
                # Unsubscribe from channel/room
                if channel and channel in [c.value for c in ChannelType]:
                    await manager.unsubscribe_channel(user_id, ChannelType(channel))
                if "room_id" in payload:
                    await manager.leave_room(user_id, payload["room_id"])
            
            elif msg_type == MessageType.DRIVER_LOCATION_UPDATE.value:
                # Driver location update - broadcast to booking room
                if user_role == "driver":
                    # Broadcast to subscribed clients
                    message = manager._create_message(
                        MessageType.DRIVER_LOCATION_UPDATE,
                        ChannelType.DRIVER_LOCATION,
                        {
                            "driver_id": user_id,
                            "lat": payload.get("lat"),
                            "lng": payload.get("lng"),
                            "heading": payload.get("heading"),
                            "speed": payload.get("speed"),
                        }
                    )
                    
                    # If booking room specified, broadcast to that room
                    if "room_id" in payload:
                        await manager.broadcast_room(
                            payload["room_id"], 
                            message,
                            exclude_user=user_id
                        )
                    else:
                        await manager.broadcast_channel(
                            ChannelType.DRIVER_LOCATION,
                            message,
                            exclude_user=user_id
                        )
            
            elif msg_type == MessageType.CHAT_MESSAGE.value:
                # Chat message - broadcast to chat room
                room_id = payload.get("room_id")
                if room_id:
                    message = manager._create_message(
                        MessageType.CHAT_MESSAGE,
                        ChannelType.CHAT,
                        {
                            "sender_id": user_id,
                            "sender_role": user_role,
                            "message": payload.get("message", ""),
                            "room_id": room_id,
                        }
                    )
                    await manager.broadcast_room(room_id, message)
            
            elif msg_type == MessageType.CHAT_TYPING.value:
                # Typing indicator
                room_id = payload.get("room_id")
                if room_id:
                    message = manager._create_message(
                        MessageType.CHAT_TYPING,
                        ChannelType.CHAT,
                        {
                            "sender_id": user_id,
                            "is_typing": payload.get("is_typing", False),
                            "room_id": room_id,
                        }
                    )
                    await manager.broadcast_room(
                        room_id, 
                        message, 
                        exclude_user=user_id
                    )
            
            else:
                # Unknown message type - echo back with error
                await manager.send_personal_message(
                    user_id,
                    websocket,
                    manager._create_message(
                        MessageType.ERROR,
                        ChannelType.NOTIFICATION,
                        {"error": f"Unknown message type: {msg_type}"}
                    )
                )
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(websocket, user_id)


# =============================================================================
# Helper Functions (for use by other modules)
# =============================================================================

async def notify_booking_update(
    booking_id: str,
    client_id: str,
    driver_id: Optional[str],
    update_type: MessageType,
    data: dict
) -> None:
    """
    Send booking update notifications.
    Called by booking endpoints when status changes.
    """
    message = manager._create_message(
        update_type,
        ChannelType.BOOKING,
        {
            "booking_id": booking_id,
            **data
        }
    )
    
    # Notify client
    await manager.send_to_user(client_id, message)
    
    # Notify driver if assigned
    if driver_id:
        await manager.send_to_user(driver_id, message)
    
    # Also broadcast to booking room
    room_id = f"booking:{booking_id}"
    await manager.broadcast_room(room_id, message)


async def notify_driver_assigned(
    booking_id: str,
    client_id: str,
    driver_id: str,
    driver_info: dict
) -> None:
    """Notify client when driver is assigned."""
    await notify_booking_update(
        booking_id,
        client_id,
        driver_id,
        MessageType.DRIVER_ASSIGNED,
        {"driver": driver_info}
    )


async def notify_driver_arrived(
    booking_id: str,
    client_id: str,
    driver_id: str
) -> None:
    """Notify client when driver arrives at pickup."""
    await notify_booking_update(
        booking_id,
        client_id,
        driver_id,
        MessageType.DRIVER_ARRIVED,
        {}
    )


async def notify_new_support_ticket(ticket_id: str, ticket_data: dict) -> None:
    """Notify admins about new support ticket."""
    message = manager._create_message(
        MessageType.NEW_SUPPORT_TICKET,
        ChannelType.ADMIN,
        {
            "ticket_id": ticket_id,
            **ticket_data
        }
    )
    await manager.broadcast_by_role("admin", message)


async def send_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info"
) -> None:
    """Send a notification to a specific user."""
    msg = manager._create_message(
        MessageType.NOTIFICATION_NEW,
        ChannelType.NOTIFICATION,
        {
            "title": title,
            "message": message,
            "notification_type": notification_type,
        }
    )
    await manager.send_to_user(user_id, msg)


async def notify_new_booking_offer(
    booking_id: str,
    booking_data: dict,
    available_driver_ids: list[str]
) -> None:
    """
    Notify available drivers about a new booking offer.
    Called when a new booking is created and needs driver assignment.
    
    Args:
        booking_id: The ID of the new booking
        booking_data: Booking details (pickup, dropoff, fare, etc.)
        available_driver_ids: List of driver user IDs who are online and available
    """
    message = manager._create_message(
        MessageType.BOOKING_CREATED,
        ChannelType.BOOKING,
        {
            "booking_id": booking_id,
            "offer_type": "new_booking",
            **booking_data
        }
    )
    
    # Send to each available driver
    for driver_id in available_driver_ids:
        await manager.send_to_user(driver_id, message)
    
    print(f"Sent booking offer {booking_id} to {len(available_driver_ids)} available drivers")


async def get_online_drivers() -> list[str]:
    """Get list of online driver user IDs."""
    return [
        user_id for user_id, metadata in manager.user_metadata.items()
        if metadata.get("role") == "driver"
    ]


# =============================================================================
# Status Endpoints (REST, for debugging)
# =============================================================================

@router.get("/status")
async def websocket_status():
    """Get WebSocket server status (for debugging)."""
    return {
        "online_users": manager.get_online_users(),
        "connection_count": manager.get_connection_count(),
        "user_metadata": manager.user_metadata,
        "channels": {
            channel: len(users) 
            for channel, users in manager.channel_subscriptions.items()
        },
        "rooms": {
            room: len(users) 
            for room, users in manager.room_subscriptions.items()
        },
    }


@router.get("/online/{user_id}")
async def check_user_online(user_id: str):
    """Check if a specific user is online."""
    return {
        "user_id": user_id,
        "online": manager.is_user_online(user_id)
    }
