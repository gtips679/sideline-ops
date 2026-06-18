import type { BootstrapData } from "./types";

const now = "2026-06-17T14:00:00Z";

export const demoData: BootstrapData = {
  users: [
    { id: "user_glenn", display_name: "Glenn", phone: "555-0100", email: "glenn@sidelinesupplies.example", role: "admin", is_active: 1, created_at: now, updated_at: now },
    { id: "user_manager", display_name: "Morgan Reed", phone: "555-0101", email: "morgan@sidelinesupplies.example", role: "manager", is_active: 1, created_at: now, updated_at: now },
    { id: "user_ava", display_name: "Ava Johnson", phone: "555-0102", email: "ava@sidelinesupplies.example", role: "staff", is_active: 1, created_at: now, updated_at: now },
    { id: "user_ben", display_name: "Ben Carter", phone: "555-0103", email: "ben@sidelinesupplies.example", role: "staff", is_active: 1, created_at: now, updated_at: now },
    { id: "user_carmen", display_name: "Carmen Diaz", phone: "555-0104", email: "carmen@sidelinesupplies.example", role: "staff", is_active: 1, created_at: now, updated_at: now },
    { id: "user_devin", display_name: "Devin Lee", phone: "555-0105", email: "devin@sidelinesupplies.example", role: "staff", is_active: 1, created_at: now, updated_at: now },
    { id: "user_ella", display_name: "Ella Brooks", phone: "555-0106", email: "ella@sidelinesupplies.example", role: "staff", is_active: 1, created_at: now, updated_at: now },
    { id: "user_finn", display_name: "Finn Walker", phone: "555-0107", email: "finn@sidelinesupplies.example", role: "staff", is_active: 1, created_at: now, updated_at: now },
  ],
  locations: [
    { id: "loc_rock_creek_gym", name: "Rock Creek Gym", location_type: "gym", notes: "Indoor concessions and staff check-in.", is_active: 1, created_at: now, updated_at: now },
    { id: "loc_rock_creek_baseball", name: "Rock Creek Baseball", location_type: "baseball", notes: "Main baseball concession stand.", is_active: 1, created_at: now, updated_at: now },
    { id: "loc_rock_creek_tball", name: "Rock Creek T-ball", location_type: "t-ball", notes: "Small field setup with portable inventory.", is_active: 1, created_at: now, updated_at: now },
    { id: "loc_veterans_gym", name: "Veterans Gym", location_type: "gym", notes: "Shared gym location.", is_active: 1, created_at: now, updated_at: now },
    { id: "loc_dchs_baseball", name: "DCHS Baseball", location_type: "baseball", notes: "High school baseball field.", is_active: 1, created_at: now, updated_at: now },
    { id: "loc_dchs_soccer", name: "DCHS Soccer", location_type: "soccer", notes: "High school soccer field.", is_active: 1, created_at: now, updated_at: now },
    { id: "loc_lanierland_football", name: "Lanierland Football", location_type: "football", notes: "Large crowd football concessions.", is_active: 1, created_at: now, updated_at: now },
  ],
  events: [
    { id: "event_rock_creek_friday", location_id: "loc_rock_creek_gym", location_name: "Rock Creek Gym", title: "Friday Night Basketball", event_type: "basketball", starts_at: "2026-06-19T22:00:00Z", ends_at: "2026-06-20T02:00:00Z", expected_crowd: 350, notes: "Two registers expected.", status: "scheduled", created_at: now, updated_at: now },
    { id: "event_dchs_baseball_sat", location_id: "loc_dchs_baseball", location_name: "DCHS Baseball", title: "DCHS Baseball Tournament", event_type: "baseball", starts_at: "2026-06-20T14:00:00Z", ends_at: "2026-06-20T21:00:00Z", expected_crowd: 500, notes: "Restock drinks before first pitch.", status: "scheduled", created_at: now, updated_at: now },
    { id: "event_lanierland_scrimmage", location_id: "loc_lanierland_football", location_name: "Lanierland Football", title: "Lanierland Summer Scrimmage", event_type: "football", starts_at: "2026-06-23T21:30:00Z", ends_at: "2026-06-24T01:30:00Z", expected_crowd: 700, notes: "Large grill setup likely.", status: "planning", created_at: now, updated_at: now },
  ],
  availabilityRequests: [
    {
      id: "avail_req_dchs_sat",
      event_id: "event_dchs_baseball_sat",
      event_title: "DCHS Baseball Tournament",
      location_name: "DCHS Baseball",
      starts_at: "2026-06-20T14:00:00Z",
      title: "DCHS Baseball Saturday Coverage",
      message: "Please reply with your availability for the Saturday tournament.",
      response_deadline: "2026-06-19T20:00:00Z",
      status: "open",
      created_by_user_id: "user_glenn",
      created_at: now,
      updated_at: now,
      recipients: [
        { id: "avail_recipient_dchs_user_ava", request_id: "avail_req_dchs_sat", user_id: "user_ava", display_name: "Ava Johnson", role: "staff", delivery_status: "pending", created_at: now, updated_at: now },
        { id: "avail_recipient_dchs_user_ben", request_id: "avail_req_dchs_sat", user_id: "user_ben", display_name: "Ben Carter", role: "staff", delivery_status: "pending", created_at: now, updated_at: now },
        { id: "avail_recipient_dchs_user_carmen", request_id: "avail_req_dchs_sat", user_id: "user_carmen", display_name: "Carmen Diaz", role: "staff", delivery_status: "pending", created_at: now, updated_at: now },
        { id: "avail_recipient_dchs_user_devin", request_id: "avail_req_dchs_sat", user_id: "user_devin", display_name: "Devin Lee", role: "staff", delivery_status: "pending", created_at: now, updated_at: now },
        { id: "avail_recipient_dchs_user_ella", request_id: "avail_req_dchs_sat", user_id: "user_ella", display_name: "Ella Brooks", role: "staff", delivery_status: "pending", created_at: now, updated_at: now },
        { id: "avail_recipient_dchs_user_finn", request_id: "avail_req_dchs_sat", user_id: "user_finn", display_name: "Finn Walker", role: "staff", delivery_status: "pending", created_at: now, updated_at: now },
      ],
      responses: [
        { id: "avail_resp_ava", request_id: "avail_req_dchs_sat", user_id: "user_ava", display_name: "Ava Johnson", role: "staff", response: "yes", note: "Can work the morning and lunch rush.", responded_at: now, created_at: now, updated_at: now },
        { id: "avail_resp_ben", request_id: "avail_req_dchs_sat", user_id: "user_ben", display_name: "Ben Carter", role: "staff", response: "maybe", note: "Need to confirm family plans.", responded_at: now, created_at: now, updated_at: now },
        { id: "avail_resp_carmen", request_id: "avail_req_dchs_sat", user_id: "user_carmen", display_name: "Carmen Diaz", role: "staff", response: "no", note: "Out of town.", responded_at: now, created_at: now, updated_at: now },
        { id: "avail_resp_devin", request_id: "avail_req_dchs_sat", user_id: "user_devin", display_name: "Devin Lee", role: "staff", response: "yes", note: null, responded_at: now, created_at: now, updated_at: now },
      ],
    },
  ],
  activity: [
    { id: "activity_seed_1", actor_user_id: "user_glenn", actor_display_name: "Glenn", entity_type: "availability_request", entity_id: "avail_req_dchs_sat", action: "created", summary: "Glenn requested availability for DCHS Baseball Saturday Coverage.", metadata_json: "{\"source\":\"seed\"}", created_at: now },
    { id: "activity_seed_2", actor_user_id: "user_ava", actor_display_name: "Ava Johnson", entity_type: "availability_response", entity_id: "avail_resp_ava", action: "responded_yes", summary: "Ava Johnson responded yes for DCHS Baseball Saturday Coverage.", metadata_json: "{\"source\":\"seed\"}", created_at: now },
    { id: "activity_seed_3", actor_user_id: "user_carmen", actor_display_name: "Carmen Diaz", entity_type: "availability_response", entity_id: "avail_resp_carmen", action: "responded_no", summary: "Carmen Diaz responded no for DCHS Baseball Saturday Coverage.", metadata_json: "{\"source\":\"seed\"}", created_at: now },
  ],
};
