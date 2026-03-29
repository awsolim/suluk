import { cache } from "react";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "./queries";

export const getCachedMosqueBySlug = cache(getMosqueBySlug);
export const getCachedProfile = cache(getProfileForCurrentUser);
export const getCachedMembership = cache(getMosqueMembershipForUser);
