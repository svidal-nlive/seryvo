Here’s a **stripped-down OpenAPI 3.0 MVP spec** that keeps only the essentials:

- Auth (register/login, me)
    
- Config: regions, service types
    
- Pricing estimate
    
- Bookings (client side: create/list/get/cancel)
    
- Driver workflow (jobs list + accept/decline/arrive/start/complete + status/location)
    

No payments, no support tickets, no chat, no notifications, no admin CRUD.

```yaml
openapi: 3.0.3
info:
  title: Transport Booking Platform API (MVP)
  version: 0.1.0
  description: >
    Minimal MVP API for a multi-role transport booking platform.

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
      enum:
        - pending
        - accepted
        - en_route
        - arrived
        - in_progress
        - completed
        - cancelled

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
          nullable: true
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

    ErrorResponse:
      type: object
      properties:
        status:
          type: integer
        error:
          type: string
        message:
          type: string

paths:
  # ======================
  # Auth
  # ======================
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
      summary: Get current user info
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

  # ======================
  # Config: Regions & Service Types
  # ======================
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

  # ======================
  # Bookings (Client & Driver)
  # ======================
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
      summary: Create a new booking (client)
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

  # ======================
  # Driver Workflow
  # ======================
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
```

If you want, I can:

- Add a **tiny MVP “admin-only” block** (just enough to seed regions/service types/pricing), or
    
- Generate a **TypeScript client** stub (e.g., Axios-based) from this spec.