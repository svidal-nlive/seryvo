# **🚖 Transport App — Feature Matrix (Client / Driver / Support / Admin)**

| **Feature Category**                             | **Client**          | **Driver**           | **Support**     | **Admin**        |
| ------------------------------------------------ | ------------------- | -------------------- | --------------- | ---------------- |
| **1. Authentication & Profiles**                 |                     |                      |                 |                  |
| User Registration / Login                        | ✔️                  | ✔️                   | ✔️              | ✔️               |
| View/Edit Profile                                | ✔️                  | ✔️                   | ✔️ limited      | ✔️ (manage all)  |
| Role-Based Access Control                        | —                   | —                    | —               | ✔️ configure     |
| Document Upload (Driver)                         | —                   | ✔️                   | ✔️ verify       | ✔️ approve       |
| Saved Locations / Preferences                    | ✔️                  | —                    | —               | —                |
| Notification Preferences                         | ✔️                  | ✔️                   | —               | —                |
| Account Suspension / Re-Verification Tools       | —                   | —                    | ✔️ limited      | ✔️ full control  |
| **2. Booking Creation & Management**             |                     |                      |                 |                  |
| Create New Booking (ASAP)                        | ✔️                  | —                    | ✔️ on behalf    | ✔️ on behalf     |
| Create Scheduled Booking                         | ✔️                  | —                    | ✔️              | ✔️               |
| Multi-stop Trips                                 | ✔️                  | —                    | ✔️              | ✔️               |
| Modify Booking Before Acceptance                 | ✔️                  | —                    | ✔️              | ✔️               |
| Cancel Booking                                   | ✔️                  | ✔️ (driver-led)      | ✔️              | ✔️               |
| View Active & Upcoming Trips                     | ✔️                  | ✔️                   | ✔️              | ✔️               |
| Rebook Past Trip                                 | ✔️                  | —                    | —               | —                |
| **3. Trip Details Input**                        |                     |                      |                 |                  |
| Pickup Location                                  | ✔️                  | —                    | ✔️              | ✔️               |
| Dropoff Location                                 | ✔️                  | —                    | ✔️              | ✔️               |
| Passenger Count                                  | ✔️                  | —                    | ✔️              | ✔️               |
| Special Requirements                             | ✔️                  | —                    | ✔️              | ✔️               |
| Driver Notes                                     | ✔️                  | —                    | ✔️              | ✔️               |
| Vehicle/Service Type Selection                   | ✔️                  | —                    | ✔️              | ✔️ update types  |
| **4. Driver Workflow**                           |                     |                      |                 |                  |
| Go Online / Offline                              | —                   | ✔️                   | —               | —                |
| Receive Job Offers                               | —                   | ✔️                   | —               | —                |
| Accept / Decline Jobs                            | —                   | ✔️                   | —               | —                |
| Navigate to Pickup                               | —                   | ✔️                   | —               | —                |
| Start Trip / End Trip                            | —                   | ✔️                   | —               | —                |
| Add Notes (tolls, waiting time)                  | —                   | ✔️                   | ✔️ review       | ✔️ override      |
| Safety Flows (incident reporting)                | —                   | ✔️                   | ✔️              | ✔️               |
| **5. Real-Time Status & Tracking**               |                     |                      |                 |                  |
| View Driver ETA                                  | ✔️                  | —                    | ✔️              | ✔️               |
| Live Tracking Map                                | ✔️                  | ✔️                   | ✔️              | ✔️               |
| Trip Status Timeline                             | ✔️                  | ✔️                   | ✔️              | ✔️               |
| Push Notifications                               | ✔️                  | ✔️                   | —               | —                |
| Driver Arrival Alerts                            | ✔️                  | —                    | ✔️              | —                |
| Trip Progress Bar                                | ✔️                  | ✔️                   | ✔️              | ✔️               |
| **6. Communication System**                      |                     |                      |                 |                  |
| Chat w/ Driver                                   | ✔️ after acceptance | ✔️                   | —               | —                |
| Chat w/ Support                                  | ✔️                  | ✔️                   | ✔️ (respond)    | ✔️ (view)        |
| Call Driver                                      | ✔️                  | ✔️                   | —               | —                |
| Call Client                                      | —                   | ✔️                   | ✔️              | ✔️               |
| Multi-party (Driver ↔ Client ↔ Support)          | —                   | —                    | ✔️ facilitation | ✔️               |
| Chat Transcript Access                           | —                   | —                    | ✔️              | ✔️ audit         |
| **7. Payments & Billing**                        |                     |                      |                 |                  |
| Add Payment Methods                              | ✔️                  | —                    | —               | —                |
| Pay for Trip (in-app or pre-authorize)           | ✔️                  | —                    | —               | —                |
| View Receipts & Invoices                         | ✔️                  | ✔️ (earnings only)   | ✔️ view         | ✔️ manage        |
| Apply Promo Codes                                | ✔️                  | —                    | —               | ✔️ create/assign |
| Financial Dispute Tools                          | ✔️ start dispute    | ✔️ provide info      | ✔️ resolve      | ✔️ oversee       |
| **8. Earnings (Driver)**                         |                     |                      |                 |                  |
| View Daily/Weekly Earnings                       | —                   | ✔️                   | —               | ✔️ overview      |
| Payout History                                   | —                   | ✔️                   | —               | ✔️               |
| Payout Scheduling                                | —                   | ✔️                   | —               | ✔️ configure     |
| Commission / Bonus Details                       | —                   | ✔️                   | —               | ✔️ manage        |
| **9. Support Operations**                        |                     |                      |                 |                  |
| Ticket Submission                                | ✔️                  | ✔️                   | —               | —                |
| Ticket Queue                                     | —                   | —                    | ✔️ full         | ✔️ oversee       |
| Prioritization (urgent/VIP/trip-in-progress)     | —                   | —                    | ✔️              | ✔️               |
| Modify Trips (location, assignment)              | —                   | —                    | ✔️ limited      | ✔️ full          |
| Issue Resolution Workflows                       | —                   | —                    | ✔️              | ✔️ configure     |
| Internal Notes                                   | —                   | —                    | ✔️              | ✔️               |
| **10. Admin Controls**                           |                     |                      |                 |                  |
| Manage Users (create/edit/remove)                | —                   | —                    | —               | ✔️               |
| Manage Drivers & Vehicle Profiles                | —                   | —                    | —               | ✔️               |
| Document Verification                            | —                   | —                    | ✔️ assist       | ✔️ approve       |
| Pricing Configuration                            | —                   | —                    | —               | ✔️               |
| Surge / Zone & Region Management                 | —                   | —                    | —               | ✔️               |
| Promotions & Discount Management                 | —                   | —                    | —               | ✔️               |
| Global System Settings                           | —                   | —                    | —               | ✔️               |
| **11. Reporting & Analytics**                    |                     |                      |                 |                  |
| Past Trip History                                | ✔️                  | ✔️ (completed trips) | ✔️              | ✔️               |
| Platform KPIs (wait times, active drivers, etc.) | —                   | —                    | —               | ✔️               |
| Driver Performance                               | —                   | ✔️ personal          | ✔️ oversight    | ✔️ detailed      |
| Support Performance (response, resolution time)  | —                   | —                    | ✔️              | ✔️               |
| Revenue & Financial Reports                      | —                   | —                    | —               | ✔️               |
| Audit Logs                                       | —                   | —                    | —               | ✔️               |
| **12. Safety & Compliance**                      |                     |                      |                 |                  |
| Emergency Contact / SOS                          | ✔️ during trip      | ✔️                   | ✔️              | ✔️               |
| Trip Sharing (send link to family)               | ✔️                  | —                    | —               | —                |
| Incident Reporting                               | ✔️                  | ✔️                   | ✔️              | ✔️               |
| Account Flags / Suspensions                      | —                   | —                    | —               | ✔️               |
| Driver Document Expiry Alerts                    | —                   | ✔️                   | ✔️              | ✔️               |
