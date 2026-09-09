/**
 * Queenix Gym — Manual API stub
 * Replaced automatically by `npx convex dev` which generates
 * convex/_generated/api.d.ts. This file lets the app compile and typecheck
 * before Convex has been deployed for the first time.
 *
 * After running `npx convex dev` once, this file is overridden and the
 * fully-typed real `api` object takes over.
 */

type FunctionRef = any;

export const api: {
  queries: {
    memberships: {
      getCurrentMembership: FunctionRef;
      getAvailablePlans: FunctionRef;
      getMembershipHistory: FunctionRef;
      getMyPayments: FunctionRef;
      getApprovals: FunctionRef;
    };
    classes: {
      getUpcomingClasses: FunctionRef;
      getClassById: FunctionRef;
      getMyBookings: FunctionRef;
      getClassRoster: FunctionRef;
      getTodayRoster: FunctionRef;
    };
    access: {
      getMyAccessCredential: FunctionRef;
      getCurrentOccupancy: FunctionRef;
      getRecentAccessEvents: FunctionRef;
      getOperationsLiveStatus: FunctionRef;
      getScannerHealth: FunctionRef;
    };
    users: {
      getCurrentUser: FunctionRef;
      getMemberProfile: FunctionRef;
      getLoyaltyBalance: FunctionRef;
      getMyReferrals: FunctionRef;
      getAvailableTrainers: FunctionRef;
      getTodaySessions: FunctionRef;
      getWeekSchedule: FunctionRef;
      getMyClients: FunctionRef;
      getClientDetail: FunctionRef;
      getMyEarnings: FunctionRef;
      getMyTrainerProfile: FunctionRef;
      getOwnerKPIs: FunctionRef;
      getMembersDirectory: FunctionRef;
      getOwnerMemberDetail: FunctionRef;
      getMyShifts: FunctionRef;
      getSupportQueue: FunctionRef;
      getIncidents: FunctionRef;
    };
    payments: {
      getMyPaymentMethods: FunctionRef;
      getMyInvoices: FunctionRef;
    };
  };
  mutations: {
    bookings: {
      bookClass: FunctionRef;
      cancelBooking: FunctionRef;
    };
    access: {
      rotateAccessToken: FunctionRef;
      processAccessScan: FunctionRef;
    };
    users: {
      updateMemberProfile: FunctionRef;
      switchRole: FunctionRef;
      syncFromBetterAuth: FunctionRef;
      requestEarlyPayout: FunctionRef;
      updateTrainerProfile: FunctionRef;
      decideApproval: FunctionRef;
    };
    loyalty: {
      redeemReward: FunctionRef;
      createReferral: FunctionRef;
    };
    payments: {
      createPaymentIntent: FunctionRef;
      recordPaymentSuccess: FunctionRef;
      addPaymentMethod: FunctionRef;
      removePaymentMethod: FunctionRef;
    };
    operations: {
      createSupportTicket: FunctionRef;
      createIncident: FunctionRef;
      resolveIncident: FunctionRef;
      startShift: FunctionRef;
      endShift: FunctionRef;
      recordPunch: FunctionRef;
      getLatestPunch: FunctionRef;
    };
  };
  internal: {
    mutations: {
      sync: {
        syncFromBetterAuth: FunctionRef;
      };
    };
  };
} = {
  queries: {} as any,
  mutations: {} as any,
  internal: { mutations: { sync: { syncFromBetterAuth: undefined } } },
} as any;
