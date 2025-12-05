/**
 * Support API module.
 * Handles support ticket operations.
 */

import api from '../api';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '../../types';

// ---- Types ----

export type { TicketStatus, TicketPriority, TicketCategory };

export interface TicketResponse {
  id: number;
  booking_id?: number;
  client_id?: number;
  driver_id?: number;
  assignee_id?: number;
  status: TicketStatus;
  priority: TicketPriority;
  category: string; // Backend may have additional categories
  subject: string;
  public_description: string;
  internal_notes?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTicketRequest {
  booking_id?: number;
  client_id?: number;
  driver_id?: number;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
}

export interface TicketListParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: number;
  client_id?: number;
  driver_id?: number;
  skip?: number;
  limit?: number;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  by_priority: Record<TicketPriority, number>;
  by_category: Record<TicketCategory, number>;
  avg_resolution_hours: number;
}

// ---- Helper Functions ----

/**
 * Map backend category to frontend TicketCategory.
 * Handles any additional backend categories by mapping them to 'other'.
 */
function mapCategory(category: string): TicketCategory {
  const validCategories: TicketCategory[] = ['trip_issue', 'account_issue', 'payment_dispute', 'safety_incident', 'other'];
  return validCategories.includes(category as TicketCategory) ? (category as TicketCategory) : 'other';
}

// ---- Transform Functions ----

function transformTicket(t: TicketResponse): SupportTicket {
  return {
    ticket_id: String(t.id),
    booking_id: t.booking_id ? String(t.booking_id) : undefined,
    client_id: t.client_id ? String(t.client_id) : undefined,
    driver_id: t.driver_id ? String(t.driver_id) : undefined,
    assignee_id: t.assignee_id ? String(t.assignee_id) : undefined,
    status: t.status,
    priority: t.priority,
    category: mapCategory(t.category),
    subject: t.subject,
    public_description: t.public_description,
    internal_notes: t.internal_notes,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

// ---- API Functions ----

/**
 * Get a list of support tickets.
 */
export async function getTickets(params?: TicketListParams): Promise<SupportTicket[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.assignee_id) searchParams.set('assignee_id', String(params.assignee_id));
  if (params?.client_id) searchParams.set('client_id', String(params.client_id));
  if (params?.driver_id) searchParams.set('driver_id', String(params.driver_id));
  if (params?.skip) searchParams.set('skip', String(params.skip));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/support/tickets?${query}` : '/support/tickets';

  const tickets = await api.get<TicketResponse[]>(endpoint);
  return tickets.map(transformTicket);
}

/**
 * Get a single ticket by ID.
 */
export async function getTicketById(ticketId: string): Promise<SupportTicket> {
  const ticket = await api.get<TicketResponse>(`/support/tickets/${ticketId}`);
  return transformTicket(ticket);
}

/**
 * Create a new support ticket.
 */
export async function createTicket(data: CreateTicketRequest): Promise<SupportTicket> {
  const ticket = await api.post<TicketResponse>('/support/tickets', data);
  return transformTicket(ticket);
}

/**
 * Update a ticket's status.
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  assigneeId?: string
): Promise<SupportTicket> {
  const ticket = await api.patch<TicketResponse>(`/support/tickets/${ticketId}/status`, {
    status,
    assignee_id: assigneeId ? parseInt(assigneeId) : undefined,
  });
  return transformTicket(ticket);
}

/**
 * Assign a ticket to a support agent.
 */
export async function assignTicket(ticketId: string, assigneeId: string): Promise<SupportTicket> {
  const ticket = await api.patch<TicketResponse>(`/support/tickets/${ticketId}/assign`, {
    assignee_id: parseInt(assigneeId),
  });
  return transformTicket(ticket);
}

/**
 * Add an internal note to a ticket.
 */
export async function addTicketNote(ticketId: string, note: string): Promise<SupportTicket> {
  const ticket = await api.post<TicketResponse>(`/support/tickets/${ticketId}/notes`, { note });
  return transformTicket(ticket);
}

/**
 * Resolve a ticket.
 */
export async function resolveTicket(ticketId: string, _resolution?: string): Promise<SupportTicket> {
  return updateTicketStatus(ticketId, 'resolved');
}

/**
 * Close a ticket.
 */
export async function closeTicket(ticketId: string): Promise<SupportTicket> {
  return updateTicketStatus(ticketId, 'closed');
}

/**
 * Reopen a ticket.
 */
export async function reopenTicket(ticketId: string): Promise<SupportTicket> {
  return updateTicketStatus(ticketId, 'open');
}

/**
 * Get my assigned tickets (support agent).
 */
export async function getMyTickets(): Promise<SupportTicket[]> {
  const tickets = await api.get<TicketResponse[]>('/support/tickets/my');
  return tickets.map(transformTicket);
}

/**
 * Get ticket statistics.
 */
export async function getTicketStats(): Promise<TicketStats> {
  return api.get<TicketStats>('/support/stats');
}

/**
 * Get tickets for a specific user.
 */
export async function getTicketsByUser(
  userId: string,
  userType: 'client' | 'driver'
): Promise<SupportTicket[]> {
  const params = userType === 'client' ? { client_id: parseInt(userId) } : { driver_id: parseInt(userId) };
  return getTickets(params);
}

export const supportApi = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  assignTicket,
  addTicketNote,
  resolveTicket,
  closeTicket,
  reopenTicket,
  getMyTickets,
  getTicketStats,
  getTicketsByUser,
};

export default supportApi;
