import type { AvailabilityRequest, AvailabilityResponseValue, User } from "../../lib/types";

export function getResponseCounts(request: AvailabilityRequest, users: User[]) {
  const staff = users.filter((user) => user.role === "staff" && user.is_active);
  const counts: Record<AvailabilityResponseValue | "noResponse", number> = {
    yes: 0,
    no: 0,
    maybe: 0,
    noResponse: 0,
  };

  staff.forEach((user) => {
    const response = request.responses.find((item) => item.user_id === user.id);
    if (!response) counts.noResponse += 1;
    else counts[response.response] += 1;
  });

  return counts;
}

export function getNoResponseStaff(request: AvailabilityRequest, users: User[]) {
  return users.filter(
    (user) => user.role === "staff" && user.is_active && !request.responses.some((response) => response.user_id === user.id)
  );
}
