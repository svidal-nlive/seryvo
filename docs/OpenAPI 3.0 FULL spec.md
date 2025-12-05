Here’s an OpenAPI 3.0 YAML spec that captures the core of the API we just designed. It’s structured, valid in shape, and ready to drop into Swagger / Stoplight / Postman etc. It can be expanded further as needed.

```yaml
openapi: 3.0.3
info:
  title: Transport Booking Platform API
  version: 1.0.0
  description: >
    REST API for a multi-role transport booking platform, supporting
    clients, drivers, support agents, and admins.

x-spec-metadata:
  canonicalDefinitionsDoc: "Platform Canonical Definitions.md"
  bookingStateMachineDoc: "Booking State Machine.md"
  policiesDoc: "Policies & Rules Specification.md"

servers:
  - url: https://api.example.com/api/v1
    description: Production server
  - url: http://localhost:3000/api/v1
    description: Local development server

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Role:
      type: object
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
          example: client
        description:
          type: string

    User:
      type: object
      properties:
        id:
          type: integer
          format: int64
        full_name:
          type: string
        email:
          type: string
          format: email
        phone:
          type: string
        is_active:
          type: boolean
        roles:
          type: array
          items:
            $ref: '#/components/schemas/Role'
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    ClientProfile:
      type: object
      properties:
        default_language:
          type: string
          example: en
        notes:
          type: string

    DriverProfile:
      type: object
      properties:
        status:
          type: string
          description: Driver account status (see "Platform Canonical Definitions.md" → Driver Status Enum).
          enum: [pending_verification, inactive, active, suspended, banned]
        rating_average:
          type: number
          format: float
        total_ratings:
          type: integer

    SavedLocation:
      type: object
      properties:
        id:
          type: integer
          format: int64
        label:
          type: string
          example: Home
        address_line1:
          type: string
        address_line2:
          type: string
        city:
          type: string
        state:
          type: string
        postal_code:
          type: string
        country:
          type: string
        latitude:
          type: number
          format: float
        longitude:
          type: number
          format: float
        is_default:
          type: boolean
        created_at:
          type: string
          format: date-time

    Region:
      type: object
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        description:
          type: string
        is_active:
          type: boolean

    ServiceType:
      type: object
      properties:
        id:
          type: integer
          format: int64
        code:
          type: string
          example: standard
        name:
          type: string
        description:
          type: string
        is_active:
          type: boolean

    BookingStatus:
      type: string
      description: Booking lifecycle status (see "Booking State Machine.md" for transitions).
      enum:
        - draft
        - requested
        - driver_assigned
        - driver_en_route_pickup
        - driver_arrived
        - in_progress
        - completed
        - canceled_by_client
        - canceled_by_driver
        - canceled_by_system
        - no_show_client
        - no_show_driver
        - disputed
        - refunded

    BookingStop:
      type: object
      properties:
        id:
          type: integer
          format: int64
        position:
          type: integer
        label:
          type: string
        address_line1:
          type: string
        address_line2:
          type: string
        city:
          type: string
        state:
          type: string
        postal_code:
          type: string
        country:
          type: string
        latitude:
          type: number
          format: float
        longitude:
          type: number
          format: float

    Booking:
      type: object
      properties:
        id:
          type: integer
          format: int64
        client_id:
          type: integer
          format: int64
        driver_id:
          type: integer
          format: int64
          nullable: true
        region_id:
          type: integer
          format: int64
        service_type_id:
          type: integer
          format: int64
        status:
          $ref: '#/components/schemas/BookingStatus'
        scheduled_start_at:
          type: string
          format: date-time
          nullable: true
        started_at:
          type: string
          format: date-time
          nullable: true
        completed_at:
          type: string
          format: date-time
          nullable: true
        cancelled_at:
          type: string
          format: date-time
          nullable: true
        cancel_reason:
          type: string
          nullable: true
        passenger_count:
          type: integer
        luggage_details:
          type: string
        special_requirements:
          type: string
        estimated_fare:
          type: number
          format: float
        final_fare:
          type: number
          format: float
        currency:
          type: string
          example: USD
        stops:
          type: array
          items:
            $ref: '#/components/schemas/BookingStop'
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    FareEstimateResponse:
      type: object
      properties:
        estimated_fare:
          type: number
          format: float
        currency:
          type: string
        distance_km:
          type: number
        duration_minutes:
          type: number
        breakdown:
          type: object
          properties:
            base_fare:
              type: number
            distance_component:
              type: number
            time_component:
              type: number
            extras:
              type: number
            taxes_and_fees:
              type: number

    PaymentMethod:
      type: object
      properties:
        id:
          type: integer
          format: int64
        provider:
          type: string
          example: stripe
        provider_ref:
          type: string
        brand:
          type: string
        last4:
          type: string
        exp_month:
          type: integer
        exp_year:
          type: integer
        is_default:
          type: boolean

    Payment:
      type: object
      properties:
        id:
          type: integer
          format: int64
        booking_id:
          type: integer
          format: int64
        user_id:
          type: integer
          format: int64
        amount:
          type: number
          format: float
        currency:
          type: string
        status:
          type: string
          enum: [pending, authorized, captured, refunded, failed]
        provider:
          type: string
        provider_payment_id:
          type: string
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    SupportTicket:
      type: object
      properties:
        id:
          type: integer
          format: int64
        created_by:
          type: integer
          format: int64
        assigned_to:
          type: integer
          format: int64
          nullable: true
        booking_id:
          type: integer
          format: int64
          nullable: true
        category:
          type: string
          example: trip_issue
        status:
          type: string
          enum: [open, in_progress, resolved, closed]
        priority:
          type: string
          enum: [low, normal, high, urgent]
        subject:
          type: string
        description:
          type: string
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    SupportTicketMessage:
      type: object
      properties:
        id:
          type: integer
          format: int64
        ticket_id:
          type: integer
          format: int64
        sender_id:
          type: integer
          format: int64
        message:
          type: string
        is_internal:
          type: boolean
        created_at:
          type: string
          format: date-time

    Conversation:
      type: object
      properties:
        id:
          type: integer
          format: int64
        booking_id:
          type: integer
          format: int64
          nullable: true
        type:
          type: string
          enum: [booking, support]
        created_at:
          type: string
          format: date-time

    ConversationMessage:
      type: object
      properties:
        id:
          type: integer
          format: int64
        conversation_id:
          type: integer
          format: int64
        sender_id:
          type: integer
          format: int64
        message:
          type: string
        created_at:
          type: string
          format: date-time

    Notification:
      type: object
      properties:
        id:
          type: integer
          format: int64
        user_id:
          type: integer
          format: int64
        type:
          type: string
          example: trip_status
        title:
          type: string
        body:
          type: string
        data:
          type: object
          additionalProperties: true
        is_read:
          type: boolean
        created_at:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      properties:
        status:
          type: integer
        error:
          type: string
        message:
          type: string
        description: Standard error payload (see "System Error and Edge Case Specification.md" for taxonomy and codes).

paths:
  /auth/register:
    post:
      tags: [Auth]
      summary: Register a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [full_name, email, password, role]
              properties:
                full_name:
                  type: string
                email:
                  type: string
                  format: email
                phone:
                  type: string
                password:
                  type: string
                  format: password
                role:
                  type: string
                  enum: [client, driver]
      responses:
        '201':
          description: User registered
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
        '400':
          description: Invalid input
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /auth/login:
    post:
      tags: [Auth]
      summary: Log in and obtain a JWT
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  format: password
      responses:
        '200':
          description: Successful login
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /me:
    get:
      tags: [Me]
      summary: Get current user's basic info and roles
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          description: Unauthorized

    patch:
      tags: [Me]
      summary: Update current user's basic info
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                full_name:
                  type: string
                phone:
                  type: string
      responses:
        '200':
          description: Updated user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  /me/client-profile:
    get:
      tags: [Me]
      summary: Get client profile
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Client profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ClientProfile'
        '403':
          description: Not a client
    patch:
      tags: [Me]
      summary: Update client profile
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ClientProfile'
      responses:
        '200':
          description: Updated client profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ClientProfile'

  /me/driver-profile:
    get:
      tags: [Me]
      summary: Get driver profile
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Driver profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DriverProfile'
        '403':
          description: Not a driver
    patch:
      tags: [Me]
      summary: Update driver profile
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DriverProfile'
      responses:
        '200':
          description: Updated driver profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DriverProfile'

  /me/saved-locations:
    get:
      tags: [SavedLocations]
      summary: List saved locations for current client
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of saved locations
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SavedLocation'
    post:
      tags: [SavedLocations]
      summary: Create a saved location
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SavedLocation'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SavedLocation'

  /me/saved-locations/{id}:
    patch:
      tags: [SavedLocations]
      summary: Update a saved location
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SavedLocation'
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SavedLocation'
    delete:
      tags: [SavedLocations]
      summary: Delete a saved location
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '204':
          description: Deleted

  /regions:
    get:
      tags: [Config]
      summary: List active regions
      responses:
        '200':
          description: List of regions
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Region'

  /service-types:
    get:
      tags: [Config]
      summary: List active service types
      responses:
        '200':
          description: List of service types
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ServiceType'

  /pricing/estimate:
    get:
      tags: [Pricing]
      summary: Get fare estimate
      parameters:
        - in: query
          name: service_type_id
          required: true
          schema:
            type: integer
        - in: query
          name: pickup_lat
          required: true
          schema:
            type: number
        - in: query
          name: pickup_lng
          required: true
          schema:
            type: number
        - in: query
          name: dropoff_lat
          required: true
          schema:
            type: number
        - in: query
          name: dropoff_lng
          required: true
          schema:
            type: number
      responses:
        '200':
          description: Fare estimate
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FareEstimateResponse'

  /bookings:
    get:
      tags: [Bookings]
      summary: List bookings for current user
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: status
          schema:
            $ref: '#/components/schemas/BookingStatus'
        - in: query
          name: from
          schema:
            type: string
            format: date-time
        - in: query
          name: to
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: List of bookings
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Booking'
    post:
      tags: [Bookings]
      summary: Create a new booking
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [service_type_id, region_id, passenger_count, stops]
              properties:
                service_type_id:
                  type: integer
                region_id:
                  type: integer
                scheduled_start_at:
                  type: string
                  format: date-time
                  nullable: true
                passenger_count:
                  type: integer
                luggage_details:
                  type: string
                special_requirements:
                  type: string
                promotion_code:
                  type: string
                stops:
                  type: array
                  items:
                    $ref: '#/components/schemas/BookingStop'
      responses:
        '201':
          description: Booking created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /bookings/{id}:
    get:
      tags: [Bookings]
      summary: Get booking details
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Booking details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'
        '404':
          description: Not found
    patch:
      tags: [Bookings]
      summary: Update booking (support/admin only, limited fields)
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                cancel_reason:
                  type: string
                special_requirements:
                  type: string
      responses:
        '200':
          description: Updated booking
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /bookings/{id}/cancel:
    post:
      tags: [Bookings]
      summary: Cancel a booking
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                reason:
                  type: string
      responses:
        '200':
          description: Booking cancelled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /driver/jobs:
    get:
      tags: [Driver]
      summary: List jobs for the current driver
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: status
          schema:
            $ref: '#/components/schemas/BookingStatus'
      responses:
        '200':
          description: List of driver jobs
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Booking'

  /driver/jobs/{id}/accept:
    post:
      tags: [Driver]
      summary: Accept a job
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Job accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /driver/jobs/{id}/decline:
    post:
      tags: [Driver]
      summary: Decline a job
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Job declined
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /driver/jobs/{id}/arrive:
    post:
      tags: [Driver]
      summary: Mark as arrived at pickup
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Status updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /driver/jobs/{id}/start:
    post:
      tags: [Driver]
      summary: Start trip
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Trip started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /driver/jobs/{id}/complete:
    post:
      tags: [Driver]
      summary: Complete trip
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Trip completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Booking'

  /driver/status:
    post:
      tags: [Driver]
      summary: Update driver availability status
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status:
                  type: string
                  enum: [online, offline, break]
      responses:
        '200':
          description: Status updated

  /driver/location:
    post:
      tags: [Driver]
      summary: Send current driver location
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [latitude, longitude]
              properties:
                latitude:
                  type: number
                longitude:
                  type: number
                booking_id:
                  type: integer
                  nullable: true
      responses:
        '202':
          description: Location accepted

  /payment-methods:
    get:
      tags: [Payments]
      summary: List payment methods for current user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Payment methods
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PaymentMethod'
    post:
      tags: [Payments]
      summary: Add a payment method
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentMethod'
      responses:
        '201':
          description: Payment method created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentMethod'

  /payment-methods/{id}:
    patch:
      tags: [Payments]
      summary: Update payment method
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentMethod'
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentMethod'
    delete:
      tags: [Payments]
      summary: Delete payment method
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '204':
          description: Deleted

  /bookings/{id}/pay:
    post:
      tags: [Payments]
      summary: Pay for a booking
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [payment_method_id]
              properties:
                payment_method_id:
                  type: integer
      responses:
        '200':
          description: Payment captured
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'

  /support/tickets:
    get:
      tags: [Support]
      summary: List tickets created by current user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Tickets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SupportTicket'
    post:
      tags: [Support]
      summary: Create a new support ticket
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [category, subject, description]
              properties:
                booking_id:
                  type: integer
                  nullable: true
                category:
                  type: string
                subject:
                  type: string
                description:
                  type: string
      responses:
        '201':
          description: Ticket created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SupportTicket'

  /support/tickets/{id}:
    get:
      tags: [Support]
      summary: Get ticket details
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Ticket details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SupportTicket'

  /support/tickets/{id}/messages:
    get:
      tags: [Support]
      summary: List messages for a ticket
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Ticket messages
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SupportTicketMessage'
    post:
      tags: [Support]
      summary: Add message to ticket
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [message]
              properties:
                message:
                  type: string
                is_internal:
                  type: boolean
      responses:
        '201':
          description: Message created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SupportTicketMessage'

  /support/queue:
    get:
      tags: [Support]
      summary: Support queue (support/admin only)
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: status
          schema:
            type: string
        - in: query
          name: priority
          schema:
            type: string
      responses:
        '200':
          description: Tickets in queue
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SupportTicket'

  /conversations:
    get:
      tags: [Chat]
      summary: List conversations for current user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Conversations
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Conversation'
    post:
      tags: [Chat]
      summary: Create a conversation (usually system-driven)
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                booking_id:
                  type: integer
                  nullable: true
                participant_ids:
                  type: array
                  items:
                    type: integer
      responses:
        '201':
          description: Conversation created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Conversation'

  /conversations/{id}:
    get:
      tags: [Chat]
      summary: Get conversation details
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Conversation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Conversation'

  /conversations/{id}/messages:
    get:
      tags: [Chat]
      summary: List messages in a conversation
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Messages
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ConversationMessage'
    post:
      tags: [Chat]
      summary: Send a message in a conversation
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [message]
              properties:
                message:
                  type: string
      responses:
        '201':
          description: Message sent
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConversationMessage'

  /notifications:
    get:
      tags: [Notifications]
      summary: List notifications for current user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Notifications
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Notification'

  /notifications/{id}/read:
    patch:
      tags: [Notifications]
      summary: Mark a notification as read
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: integer
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                is_read:
                  type: boolean
                  default: true
      responses:
        '200':
          description: Updated notification
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Notification'
```
