import { cache } from "react";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getMosqueMembers,
} from "./queries";

export const getCachedMosqueBySlug = cache(getMosqueBySlug);
export const getCachedProfile = cache(getProfileForCurrentUser);
export const getCachedMembership = cache(getMosqueMembershipForUser);
export const getCachedMosqueMembers = cache(getMosqueMembers);
