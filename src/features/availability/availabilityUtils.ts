import type { AvailabilityRecipient, AvailabilityRequest, AvailabilityResponseValue, User } from "../../lib/types";

type ResponseGroupKey = AvailabilityResponseValue | "noResponse";

export function getResponseCounts(request: AvailabilityRequest) {
  const counts: Record<AvailabilityResponseValue | "noResponse", number> = {
    yes: 0,
    no: 0,
    maybe: 0,
    noResponse: 0,
  };

  request.recipients.forEach((recipient) => {
    const response = request.responses.find((item) => item.user_id === recipient.user_id);
    if (!response) counts.noResponse += 1;
    else counts[response.response] += 1;
  });

  return counts;
}

export function getResponseGroups(request: AvailabilityRequest) {
  const groups: Record<ResponseGroupKey, AvailabilityRecipient[]> = {
    yes: [],
    no: [],
    maybe: [],
    noResponse: [],
  };

  request.recipients.forEach((recipient) => {
    const response = request.responses.find((item) => item.user_id === recipient.user_id);
    groups[response?.response ?? "noResponse"].push(recipient);
  });

  return groups;
}

export function getNoResponseStaff(request: AvailabilityRequest) {
  return getResponseGroups(request).noResponse;
}

export function getRequestsForUser(requests: AvailabilityRequest[], user: User) {
  return requests.filter((request) => request.recipients.some((recipient) => recipient.user_id === user.id));
}
