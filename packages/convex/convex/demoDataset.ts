/**
 * Queenix Gym — realistic demo dataset (dev/demo only).
 *
 * Run: npx convex run seed:seedDemoUsers ...   (links BetterAuth accounts)
 *      npx convex run demoDataset:seedDemoDataset
 *
 * Idempotent: every section checks for existing rows first and skips when
 * the demo data is already present, so re-running never duplicates.
 * Internal: reachable only with the Convex admin key (scripts/seed-demo-users.mjs
 * or `npx convex run`), never from a browser/phone.
 */

import { internalMutation } from './_generated/server';

const DAY = 24 * 60 * 60 * 1000;

// Bounds-checked index read: workspace tsconfigs enable
// noUncheckedIndexedAccess, and seed tables are fixed-shape.
function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`seed index out of range: ${i}`);
  return v;
}

type Ctx = any;

async function ensureUser(
  ctx: Ctx,
  email: string,
  fullName: string,
  activeRole: any,
  roles: any[],
) {
  const existing = await ctx.db
    .query('users')
    .withIndex('by_email', (q: any) => q.eq('email', email))
    .first();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert('users', {
    email,
    fullName,
    activeRole,
    roles,
    emailVerified: true,
    phoneVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  return await ctx.db.get(id);
}

async function ensureMemberProfile(ctx: Ctx, userId: any, i: number) {
  const existing = await ctx.db
    .query('memberProfiles')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .first();
  if (existing) return existing;
  const langs = ['en', 'en', 'en', 'ar'] as const;
  const id = await ctx.db.insert('memberProfiles', {
    userId,
    gender: 'female',
    emergencyContact: {
      name: 'Emergency Contact',
      phone: `+97150100010${i}`,
      relationship: 'Sister',
    },
    vehicles: [],
    preferences: {
      notifications: true,
      marketing: i % 2 === 0,
      language: langs[i % langs.length],
    },
  });
  return await ctx.db.get(id);
}

export const seedDemoDataset = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const counts: Record<string, number> = {};
    const count = (k: string, n: number) => {
      counts[k] = (counts[k] ?? 0) + n;
    };

    // Already seeded? Demo payments are the marker.
    const marker = await ctx.db
      .query('payments')
      .withIndex('by_idempotencyKey', (q: any) => q.eq('idempotencyKey', 'demo-marker-001'))
      .first();
    const fresh = !marker;

    // --- branch ------------------------------------------------------------
    let branch = await ctx.db
      .query('branches')
      .withIndex('by_name', (q: any) => q.eq('name', 'Queenix JBR'))
      .first();
    if (!branch) {
      // createdBy needs a user; use whoever seeds first (patched below).
      const tmpOwner = await ensureUser(
        ctx,
        'owner@queenix.test',
        'Sara Owner',
        'finance',
        ['finance'],
      );
      const id = await ctx.db.insert('branches', {
        name: 'Queenix JBR',
        city: 'Dubai',
        address: 'The Walk, Jumeirah Beach Residence, Dubai, UAE',
        phone: '+97144001234',
        isActive: true,
        openedAt: now - 400 * DAY,
        createdBy: tmpOwner._id,
        createdAt: now - 400 * DAY,
        updatedAt: now,
      });
      branch = await ctx.db.get(id);
      count('branches', 1);
    }
    if (!branch) throw new Error('Branch seed failed');

    // --- staff (stubs link up when BetterAuth accounts sign up) ------------
    const owner = await ensureUser(ctx, 'owner@queenix.test', 'Sara Owner', 'finance', ['finance']);
    const ops = await ensureUser(ctx, 'ops@queenix.test', 'Khalid Ops', 'operations', ['operations']);
    const trainer = await ensureUser(ctx, 'trainer@queenix.test', 'Layla Trainer', 'trainer', ['trainer']);
    const salon = await ensureUser(ctx, 'salon@queenix.test', 'Maha Stylist', 'salon', ['salon']);
    const coffee = await ensureUser(ctx, 'coffee@queenix.test', 'Rania Barista', 'coffee', ['coffee']);
    const demoMember = await ensureUser(ctx, 'member@queenix.test', 'Amna Member', 'member', ['member']);

    for (const [u, role] of [
      [owner, 'finance'],
      [ops, 'operations'],
      [trainer, 'trainer'],
      [salon, 'salon'],
      [coffee, 'coffee'],
    ] as const) {
      const link = await ctx.db
        .query('branchStaff')
        .withIndex('by_branch_user', (q: any) =>
          q.eq('branchId', branch._id).eq('userId', u._id),
        )
        .first();
      if (!link) {
        await ctx.db.insert('branchStaff', {
          branchId: branch._id,
          userId: u._id,
          role,
          isPrimary: true,
          assignedBy: owner._id,
          createdAt: now,
        });
        count('branchStaff', 1);
      }
    }

    // --- plans (reuse seed.ts plans when present) ---------------------------
    // Ignore access.ts's inactive '__system__' placeholder plan: counting it
    // skipped plan creation and pointed every demo membership at it.
    const realPlans = async () =>
      (await ctx.db.query('membershipPlans').take(20)).filter((p: any) => p.name !== '__system__');
    let plans = await realPlans();
    if (plans.length === 0) {
      const defs = [
        { name: 'Basic', description: 'Off-peak gym access + 1 class/week', durationDays: 30, priceCents: 29900, maxClassesPerMonth: 4, maxPTSessions: 0, features: ['Off-peak gym access', 'Locker room', '1 group class/week'] },
        { name: 'Premium', description: 'Unlimited gym + all classes + 1 PT/month', durationDays: 30, priceCents: 49900, maxClassesPerMonth: 0, maxPTSessions: 1, features: ['Unlimited gym access', 'All group classes', '1 PT session/month'] },
        { name: 'VIP', description: 'Everything + 4 PT sessions + priority booking', durationDays: 30, priceCents: 99900, maxClassesPerMonth: 0, maxPTSessions: 4, features: ['24/7 access', 'All group classes', '4 PT sessions/month', 'Priority booking'] },
      ];
      for (const d of defs) {
        await ctx.db.insert('membershipPlans', {
          ...d,
          currency: 'AED',
          isActive: true,
          isTrial: false,
          trialDays: 0,
        });
      }
      plans = await realPlans();
      count('membershipPlans', defs.length);
    }
    const planByName = new Map(plans.map((p: any) => [p.name, p]));
    const planIds = new Set(plans.map((p: any) => String(p._id)));

    // --- members ------------------------------------------------------------
    const memberDefs = [
      { email: 'maryam@queenix.test', name: 'Maryam Al-Mansoori', plan: 'VIP', status: 'active', joinedDaysAgo: 210 },
      { email: 'reem@queenix.test', name: 'Reem Hassan', plan: 'Premium', status: 'active', joinedDaysAgo: 96 },
      { email: 'fatima@queenix.test', name: 'Fatima Al-Zaabi', plan: 'VIP', status: 'active', joinedDaysAgo: 320 },
      { email: 'noura@queenix.test', name: 'Noura Al-Suwaidi', plan: 'Basic', status: 'frozen', joinedDaysAgo: 150 },
      { email: 'hessa@queenix.test', name: 'Hessa Bin Touq', plan: 'Premium', status: 'active', joinedDaysAgo: 41 },
      { email: 'shaikha@queenix.test', name: 'Shaikha Al-Falasi', plan: 'Basic', status: 'trial', joinedDaysAgo: 5 },
      { email: 'elena@queenix.test', name: 'Elena Petrova', plan: 'Premium', status: 'active', joinedDaysAgo: 64 },
      { email: 'priya@queenix.test', name: 'Priya Nair', plan: 'Basic', status: 'expired', joinedDaysAgo: 200 },
    ] as const;
    const members: any[] = [];
    for (let i = 0; i < memberDefs.length; i++) {
      const def = at(memberDefs, i);
      const u = await ensureUser(ctx, def.email, def.name, 'member', ['member']);
      members.push(u);
      await ensureMemberProfile(ctx, u._id, i);
      const existing = await ctx.db
        .query('memberships')
        .withIndex('by_user', (q: any) => q.eq('userId', u._id))
        .first();
      const plan = planByName.get(def.plan) ?? at(plans, 0);
      if (existing && !planIds.has(String(existing.planId))) {
        // Repair memberships seeded against the '__system__' placeholder.
        await ctx.db.patch(existing._id, { planId: plan._id });
        count('membershipsRepaired', 1);
      }
      if (!existing) {
        const start = now - def.joinedDaysAgo * DAY;
        await ctx.db.insert('memberships', {
          userId: u._id,
          planId: plan._id,
          status: def.status as any,
          startDate: start,
          endDate: start + 365 * DAY,
          freezes: def.status === 'frozen' ? [{ startDate: now - 6 * DAY, endDate: now + 8 * DAY, reason: 'Travel' }] : [],
          autoRenew: def.status === 'active',
          remainingClasses: def.plan === 'Basic' ? 2 : 99,
          remainingPTSessions: def.plan === 'VIP' ? 3 : def.plan === 'Premium' ? 1 : 0,
        });
        count('memberships', 1);
      }
    }

    // --- the mobile demo account (member@queenix.test) ----------------------
    // Active Premium + a live gym credential so home, the gym QR, booking,
    // coffee and documents all work on first sign-in.
    const demoProfile = await ensureMemberProfile(ctx, demoMember._id, memberDefs.length);
    // Demo car for the valet plate-scan flow (e2e/ocr.spec.ts).
    if (demoProfile && !demoProfile.vehicles?.length) {
      await ctx.db.patch(demoProfile._id, { vehicles: [{ plate: 'A 12345', make: 'Toyota', model: 'Land Cruiser', color: 'White' }] });
    }
    let demoMs = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q: any) => q.eq('userId', demoMember._id))
      .first();
    const premium = planByName.get('Premium') ?? at(plans, 0);
    if (demoMs && !planIds.has(String(demoMs.planId))) {
      await ctx.db.patch(demoMs._id, { planId: premium._id });
      count('membershipsRepaired', 1);
    }
    if (!demoMs) {
      const id = await ctx.db.insert('memberships', {
        userId: demoMember._id,
        planId: premium._id,
        status: 'active',
        startDate: now - 30 * DAY,
        endDate: now + 335 * DAY,
        freezes: [],
        autoRenew: true,
        remainingClasses: 99,
        remainingPTSessions: 1,
      });
      demoMs = await ctx.db.get(id);
      count('memberships', 1);
    }
    const demoCred = await ctx.db
      .query('accessCredentials')
      .withIndex('by_user', (q: any) => q.eq('userId', demoMember._id))
      .first();
    if (!demoCred && demoMs) {
      await ctx.db.insert('accessCredentials', {
        userId: demoMember._id,
        membershipId: demoMs._id,
        status: 'active',
        token: `demo-qr-${demoMember._id}`,
        tokenExpiresAt: now + 365 * DAY,
      });
      count('accessCredentials', 1);
    }

    // Loyalty points so the rewards screen can demo a redemption.
    const demoPoints = await ctx.db
      .query('loyaltyLedger')
      .withIndex('by_user', (q: any) => q.eq('userId', demoMember._id))
      .first();
    if (!demoPoints) {
      await ctx.db.insert('loyaltyLedger', {
        userId: demoMember._id,
        type: 'earned',
        points: 1000,
        reason: 'Welcome bonus + first 5 classes',
        createdAt: now - 7 * DAY,
      });
      count('loyaltyLedger', 1);
    }

    // --- access credentials + recent check-ins (owner KPIs) ------------------
    for (let i = 0; i < members.length; i++) {
      const u = members[i];
      const ms = await ctx.db
        .query('memberships')
        .withIndex('by_user', (q: any) => q.eq('userId', u._id))
        .first();
      if (!ms) continue;
      let cred = await ctx.db
        .query('accessCredentials')
        .withIndex('by_user', (q: any) => q.eq('userId', u._id))
        .first();
      if (!cred) {
        const cid = await ctx.db.insert('accessCredentials', {
          userId: u._id,
          membershipId: ms._id,
          status: (ms.status === 'active' || ms.status === 'trial' ? 'active' : 'suspended') as any,
          token: `demo-qr-${u._id}`,
          tokenExpiresAt: now + 365 * DAY,
          lastUsedAt: now - (i + 1) * 3600 * 1000,
        });
        cred = await ctx.db.get(cid);
        count('accessCredentials', 1);
      }
      if (!cred) throw new Error('Credential seed failed');
      if (i < 5) {
        // One check-in per user per day: skip when today's rows already
        // exist so every dev-up re-seed doesn't inflate "today's check-ins".
        const dayStart = Math.floor(now / DAY) * DAY;
        const todays = await ctx.db
          .query('accessEvents')
          .withIndex('by_user', (q: any) => q.eq('userId', u._id))
          .order('desc')
          .take(20);
        if (!todays.some((e: any) => e.timestamp >= dayStart)) {
          // Check-in today, plus yesterday volume.
          const inAt = now - (i + 2) * 3600 * 1000;
          await ctx.db.insert('accessEvents', {
            userId: u._id,
            credentialId: cred._id,
            accessPointId: 'main-gate',
            direction: 'in' as const,
            granted: true,
            timestamp: inAt,
          });
          await ctx.db.insert('accessEvents', {
            userId: u._id,
            credentialId: cred._id,
            accessPointId: 'main-gate',
            direction: 'in' as const,
            granted: true,
            timestamp: inAt - DAY,
          });
          count('accessEvents', 2);
        }
      }
    }

    // --- trainer profile + PT sessions + earnings ---------------------------
    let tProfile = await ctx.db
      .query('trainerProfiles')
      .withIndex('by_user', (q: any) => q.eq('userId', trainer._id))
      .first();
    if (!tProfile) {
      const id = await ctx.db.insert('trainerProfiles', {
        userId: trainer._id,
        bio: 'Strength & HIIT coach, 8 years. Pre/postnatal certified.',
        specialties: ['HIIT', 'Strength', 'Postnatal recovery'],
        certifications: [
          { name: 'NASM Certified Personal Trainer', issuer: 'NASM', issuedAt: now - 900 * DAY, expiresAt: now + 400 * DAY },
          { name: 'Pre & Postnatal Fitness Specialist', issuer: 'Girls Gone Strong', issuedAt: now - 300 * DAY },
        ],
        rating: 4.9,
        reviewCount: 87,
        isAvailable: true,
        hourlyRateCents: 25000,
        currency: 'AED',
      });
      tProfile = await ctx.db.get(id);
      count('trainerProfiles', 1);
    }

    const ptCount = await ctx.db
      .query('ptSessions')
      .withIndex('by_trainer', (q: any) => q.eq('trainerId', trainer._id))
      .take(1);
    if (ptCount.length === 0) {
      const sessionDefs = [
        { m: 0, daysOffset: -12, status: 'completed' },
        { m: 1, daysOffset: -9, status: 'completed' },
        { m: 2, daysOffset: -6, status: 'completed' },
        { m: 4, daysOffset: -3, status: 'completed' },
        { m: 1, daysOffset: 1, status: 'scheduled' },
        { m: 0, daysOffset: 2, status: 'scheduled' },
        { m: 6, daysOffset: 4, status: 'scheduled' },
      ] as const;
      for (let i = 0; i < sessionDefs.length; i++) {
        const s = at(sessionDefs, i);
        const slotAt = now + s.daysOffset * DAY;
        const sid = await ctx.db.insert('ptSessions', {
          trainerId: trainer._id,
          memberId: at(members, s.m)._id,
          scheduledAt: slotAt,
          durationMinutes: 60,
          status: s.status as any,
          notes: s.status === 'completed' ? 'Great session — progressive overload on compound lifts.' : undefined,
          exercises: [
            { name: 'Goblet squat', sets: 4, reps: 10, weightKg: 16 },
            { name: 'Romanian deadlift', sets: 3, reps: 12, weightKg: 30 },
          ],
          priceCents: 25000,
          currency: 'AED',
        });
        if (s.status === 'completed') {
          await ctx.db.insert('trainerEarnings', {
            trainerId: trainer._id,
            sessionId: sid,
            amountCents: 17500,
            currency: 'AED',
            commissionRate: 0.7,
            status: i < 2 ? ('paid' as const) : ('pending' as const),
            paidAt: i < 2 ? slotAt + 2 * DAY : undefined,
            createdAt: slotAt,
          });
          count('trainerEarnings', 1);
        }
        count('ptSessions', 1);
      }
    }

    // --- classes + bookings --------------------------------------------------
    // Fixed daily timetable (UTC seconds since midnight) — slots never
    // overlap, so at most ONE class is ever LIVE. Times survive day-over-day
    // because the repair pass below re-applies them on every run.
    const CLASS_SLOTS: Record<string, number> = {
      'Power Yoga': 7 * 3600,
      'Spin Rhythm': 8.5 * 3600,
      'HIIT 45': 12.5 * 3600,
      'Pilates Reformer': 18 * 3600,
      'Strength 101': 19.5 * 3600,
    };
    const classSlotStart = (typeName: string | undefined, dayStart: number, fallback: number) =>
      dayStart + (CLASS_SLOTS[typeName ?? ''] ?? fallback) * 1000;
    const existingTypes = await ctx.db.query('classTypes').take(1);
    if (existingTypes.length === 0) {
      const types = [
        { name: 'Power Yoga', description: 'Vinyasa flow with strength holds', durationMinutes: 60, capacity: 20, difficulty: 'intermediate', category: 'Mind & Body' },
        { name: 'HIIT 45', description: '45 minutes of intervals, all levels', durationMinutes: 45, capacity: 20, difficulty: 'advanced', category: 'Cardio' },
        { name: 'Pilates Reformer', description: 'Reformer fundamentals and flow', durationMinutes: 50, capacity: 12, difficulty: 'beginner', category: 'Mind & Body' },
        { name: 'Strength 101', description: 'Barbell basics for beginners', durationMinutes: 60, capacity: 15, difficulty: 'beginner', category: 'Strength' },
        { name: 'Spin Rhythm', description: 'Beat-driven indoor cycling', durationMinutes: 45, capacity: 25, difficulty: 'intermediate', category: 'Cardio' },
      ] as const;
      for (let ti = 0; ti < types.length; ti++) {
        const t = at(types, ti);
        const typeId = await ctx.db.insert('classTypes', {
          name: t.name,
          description: t.description,
          durationMinutes: t.durationMinutes,
          capacity: t.capacity,
          difficulty: t.difficulty as any,
          category: t.category,
          trainerId: trainer._id,
        });
        count('classTypes', 1);
        for (const d of [-9, -4, -1, 0, 1, 3, 6]) {
          const dayStart = Math.floor((now + d * DAY) / DAY) * DAY;
          const startsAt = classSlotStart(t.name, dayStart, 9 * 3600);
          const endsAt = startsAt + t.durationMinutes * 60 * 1000;
          const past = endsAt <= now;
          // Upcoming classes look alive: fill up to 8 distinct members.
          // Past classes keep a small attended roster. bookedCount always
          // equals real booking rows — never a synthetic number.
          const seats = past ? 4 : Math.min(t.capacity, members.length);
          const iid = await ctx.db.insert('classInstances', {
            classTypeId: typeId,
            trainerId: trainer._id,
            startsAt,
            endsAt,
            capacity: t.capacity,
            bookedCount: seats,
            waitlistCount: 0,
            status: past ? ('completed' as const) : ('scheduled' as const),
            notes: 'demo-seed',
          });
          count('classInstances', 1);
          for (let b = 0; b < seats; b++) {
            await ctx.db.insert('bookings', {
              userId: at(members, (b + ti + d + 20) % members.length)._id,
              classInstanceId: iid,
              status: past ? ('attended' as const) : ('confirmed' as const),
              bookedAt: startsAt - 2 * DAY,
              idempotencyKey: `demo-book-${ti}-${d}-${b}`,
            });
            count('bookings', 1);
          }
        }
      }
    }

    // --- class schedule repair (runs every time) ------------------------------
    // Demo instances drift stale day-over-day (yesterday's pile-up all goes
    // LIVE at once, bookedCount disagrees with real rows). Adopt legacy
    // demo instances (seeded before notes-tagging) and re-apply the fixed
    // timetable, clock-based status, and true booking counts. Only touches
    // rows the seeder owns — never user-created classes.
    {
      const allInstances = await ctx.db.query('classInstances').take(500);
      let repaired = 0;
      for (const inst of allInstances) {
        const rows = await ctx.db
          .query('bookings')
          .withIndex('by_classInstance', (q: any) => q.eq('classInstanceId', inst._id))
          .take(200);
        const isDemo =
          (inst as any).notes === 'demo-seed' ||
          rows.some((r: any) => typeof r.idempotencyKey === 'string' && r.idempotencyKey.startsWith('demo-book-'));
        if (!isDemo) continue;
        const type = await ctx.db.get(inst.classTypeId as any);
        const typeName = (type as any)?.name as string | undefined;
        const durationMin = (type as any)?.durationMinutes ?? 60;
        const dayStart = Math.floor(inst.startsAt / DAY) * DAY;
        const startsAt = classSlotStart(typeName, dayStart, 9 * 3600);
        const endsAt = startsAt + durationMin * 60 * 1000;
        let liveCount = rows.filter((r: any) => r.status !== 'cancelled').length;
        // Top up upcoming classes with distinct members so rosters look alive.
        if (startsAt > now) {
          const have = new Set(
            rows.map((r: any) => String(r.userId)),
          );
          const target = Math.min(inst.capacity, members.length);
          for (const m of members) {
            if (liveCount >= target) break;
            if (have.has(String(m._id))) continue;
            await ctx.db.insert('bookings', {
              userId: m._id,
              classInstanceId: inst._id,
              status: 'confirmed' as const,
              bookedAt: startsAt - 2 * DAY,
              idempotencyKey: `demo-topup-${String(inst._id)}-${String(m._id)}`,
            });
            liveCount++;
            have.add(String(m._id));
            count('bookings', 1);
          }
        }
        await ctx.db.patch(inst._id, {
          startsAt,
          endsAt,
          status: endsAt <= now ? ('completed' as const) : ('scheduled' as const),
          bookedCount: liveCount,
          waitlistCount: liveCount >= inst.capacity ? 2 : 0,
          notes: 'demo-seed',
        } as any);
        repaired++;
      }
      count('classInstancesRepaired', repaired);
      // De-duplicate today's demo check-ins (one per user): earlier boots
      // appended a fresh pair each run. Keep only the latest per user.
      {
        const utcDay = Math.floor(now / DAY) * DAY;
        const todaysEvents = await ctx.db
          .query('accessEvents')
          .withIndex('by_timestamp', (q: any) => q.gte('timestamp', utcDay))
          .take(500);
        const byUser = new Map<string, any[]>();
        for (const e of todaysEvents) {
          const cred = await ctx.db.get((e as any).credentialId);
          if (typeof (cred as any)?.token !== 'string' || !(cred as any).token.startsWith('demo-qr-')) continue;
          const k = String((e as any).userId);
          if (!byUser.has(k)) byUser.set(k, []);
          byUser.get(k)!.push(e);
        }
        let trimmed = 0;
        for (const [, list] of byUser) {
          list.sort((a: any, b: any) => b.timestamp - a.timestamp);
          for (const extra of list.slice(1)) {
            await ctx.db.delete(extra._id);
            trimmed++;
          }
        }
        count('accessEventsTrimmed', trimmed);
      }
      // Keep the "in gym now" occupancy widget alive: refresh today's snapshot.
      const dayAgo = now - DAY;
      const recentIns = await ctx.db
        .query('accessEvents')
        .withIndex('by_timestamp', (q: any) => q.gte('timestamp', dayAgo))
        .take(200);
      const inside = new Set(
        recentIns.filter((e: any) => e.direction === 'in').map((e: any) => String(e.userId)),
      ).size;
      const snaps = await ctx.db.query('occupancySnapshots').order('desc').take(20);
      const gate = snaps.find((s: any) => s.accessPointId === 'main-gate');
      if (gate) {
        await ctx.db.patch(gate._id, { count: inside, timestamp: now });
      } else {
        await ctx.db.insert('occupancySnapshots', {
          accessPointId: 'main-gate',
          count: inside,
          timestamp: now,
        });
        count('occupancySnapshots', 1);
      }
    }

    // --- venues: catalogue + gateway settings + orders -----------------------
    const existingItems = await ctx.db.query('coffeeItems').take(1);
    let coffeeItems: any[] = [];
    if (existingItems.length === 0) {
      const items = [
        { name: 'Flat White', priceCents: 2200 },
        { name: 'Spanish Latte', priceCents: 2600 },
        { name: 'Matcha Latte', priceCents: 2800 },
        { name: 'Protein Shake', priceCents: 3200 },
        { name: 'Butter Croissant', priceCents: 1600 },
        { name: 'Date & Walnut Cake', priceCents: 1900 },
      ];
      for (const it of items) {
        const id = await ctx.db.insert('coffeeItems', {
          name: it.name,
          priceCents: it.priceCents,
          isActive: true,
          createdAt: now - 200 * DAY,
        });
        coffeeItems.push(await ctx.db.get(id));
        count('coffeeItems', 1);
      }
    } else {
      coffeeItems = await ctx.db.query('coffeeItems').take(20);
    }

    const existingServices = await ctx.db.query('salonServices').take(1);
    let salonServices: any[] = [];
    if (existingServices.length === 0) {
      const services = [
        { name: 'Signature Haircut', priceCents: 18000, durationMin: 45 },
        { name: 'Blowout', priceCents: 12000, durationMin: 30 },
        { name: 'Classic Manicure', priceCents: 9000, durationMin: 40 },
        { name: 'Spa Pedicure', priceCents: 11000, durationMin: 50 },
        { name: 'Glow Facial', priceCents: 22000, durationMin: 60 },
      ];
      for (const s of services) {
        const id = await ctx.db.insert('salonServices', {
          name: s.name,
          priceCents: s.priceCents,
          durationMin: s.durationMin,
          isActive: true,
          createdAt: now - 200 * DAY,
        });
        salonServices.push(await ctx.db.get(id));
        count('salonServices', 1);
      }
    } else {
      salonServices = await ctx.db.query('salonServices').take(20);
    }

    for (const venue of ['coffee', 'salon'] as const) {
      const found = await ctx.db
        .query('venuePaymentSettings')
        .withIndex('by_venue', (q: any) => q.eq('venue', venue))
        .first();
      if (!found) {
        await ctx.db.insert('venuePaymentSettings', {
          venue,
          provider: 'tap',
          currency: 'AED',
          enabled: true,
          updatedAt: now,
        });
        count('venuePaymentSettings', 1);
      }
    }

    if (fresh) {
      const orderStatuses = ['served', 'served', 'ready', 'preparing', 'queued'] as const;
      for (let i = 0; i < 14; i++) {
        const item = at(coffeeItems, i % coffeeItems.length);
        const qty = 1 + (i % 2);
        await ctx.db.insert('coffeeOrders', {
          userId: at(members, i % members.length)._id,
          items: [{ itemId: item._id, qty, unitPriceCents: item.priceCents }],
          totalCents: item.priceCents * qty,
          status: orderStatuses[i % orderStatuses.length] as any,
          paymentMode: i % 3 === 0 ? ('cash' as const) : ('counter' as const),
          createdAt: now - i * 9 * 3600 * 1000,
          paidAt: i % 4 === 0 ? now - i * 9 * 3600 * 1000 + 600 * 1000 : undefined,
        });
        count('coffeeOrders', 1);
      }
      const bookingStatuses = ['completed', 'completed', 'confirmed', 'confirmed', 'pending'] as const;
      for (let i = 0; i < 10; i++) {
        const svc = at(salonServices, i % salonServices.length);
        await ctx.db.insert('salonBookings', {
          serviceId: svc._id,
          userId: at(members, (i + 2) % members.length)._id,
          startAt: now + (i - 6) * DAY,
          status: bookingStatuses[i % bookingStatuses.length] as any,
          paymentMode: i % 3 === 0 ? ('cash' as const) : ('counter' as const),
          note: i === 0 ? 'Prefers morning slots' : undefined,
          createdAt: now - (i + 1) * DAY,
          paidAt: i < 4 ? now - i * DAY : undefined,
        });
        count('salonBookings', 1);
      }
    }

    // --- finance: ledger, payouts, journal -----------------------------------
    if (fresh) {
      const payDefs = [
        { m: 0, cents: 99900, type: 'membership', desc: 'VIP annual — Maryam Al-Mansoori', daysAgo: 12, provider: 'tap' },
        { m: 1, cents: 49900, type: 'membership', desc: 'Premium monthly — Reem Hassan', daysAgo: 9, provider: 'stripe' },
        { m: 2, cents: 99900, type: 'membership', desc: 'VIP annual — Fatima Al-Zaabi', daysAgo: 6, provider: 'tap' },
        { m: 4, cents: 49900, type: 'membership', desc: 'Premium monthly — Hessa Bin Touq', daysAgo: 4, provider: 'tap' },
        { m: 6, cents: 49900, type: 'membership', desc: 'Premium monthly — Elena Petrova', daysAgo: 2, provider: 'stripe' },
        { m: 0, cents: 100000, type: 'pt_package', desc: '4× PT pack — Maryam Al-Mansoori', daysAgo: 11, provider: 'tap' },
        { m: 1, cents: 25000, type: 'pt_package', desc: '1× PT session — Reem Hassan', daysAgo: 8, provider: 'tap' },
        { m: 5, cents: 29900, type: 'membership', desc: 'Basic trial convert — Shaikha Al-Falasi', daysAgo: 1, provider: 'stripe' },
        { m: 3, cents: 29900, type: 'membership', desc: 'Basic monthly — Noura Al-Suwaidi (refunded: freeze)', daysAgo: 20, provider: 'tap', refunded: true },
        { m: 7, cents: 49900, type: 'membership', desc: 'Premium monthly — Priya Nair (pending)', daysAgo: 0, provider: 'stripe', pending: true },
      ] as const;
      for (let i = 0; i < payDefs.length; i++) {
        const p = at(payDefs, i) as any;
        await ctx.db.insert('payments', {
          userId: at(members, p.m)._id,
          amountCents: p.cents,
          currency: 'AED',
          status: p.refunded ? ('refunded' as const) : p.pending ? ('pending' as const) : ('succeeded' as const),
          type: p.type as any,
          description: p.desc,
          provider: p.provider as any,
          invoiceNumber: `QXN-2026-${String(1040 + i)}`,
          refundedAmountCents: p.refunded ? p.cents : undefined,
          idempotencyKey: i === 0 ? 'demo-marker-001' : `demo-pay-${i}`,
          createdAt: now - p.daysAgo * DAY,
          updatedAt: now - p.daysAgo * DAY,
        });
        count('payments', 1);
      }
      // Older months so revenue analytics + P&L have history.
      for (let mo = 1; mo <= 5; mo++) {
        for (let k = 0; k < 4; k++) {
          await ctx.db.insert('payments', {
            userId: at(members, (mo + k) % members.length)._id,
            amountCents: 29900 + ((mo * 7 + k * 13) % 4) * 20000,
            currency: 'AED',
            status: 'succeeded' as const,
            type: (k % 3 === 0 ? 'pt_package' : 'membership') as any,
            description: `Backfill month -${mo}`,
            provider: (k % 2 === 0 ? 'tap' : 'stripe') as any,
            idempotencyKey: `demo-backfill-${mo}-${k}`,
            createdAt: now - mo * 30 * DAY - k * DAY,
            updatedAt: now - mo * 30 * DAY - k * DAY,
          });
          count('payments', 1);
        }
      }
      await ctx.db.insert('payouts', {
        recipientId: trainer._id,
        recipientName: 'Layla Trainer',
        amountCents: 35000,
        currency: 'AED',
        method: 'bank_transfer' as const,
        status: 'paid' as const,
        reference: 'PAY-2026-031',
        notes: 'August commission',
        createdBy: owner._id,
        createdAt: now - 10 * DAY,
        updatedAt: now - 8 * DAY,
      });
      await ctx.db.insert('payouts', {
        recipientId: trainer._id,
        recipientName: 'Layla Trainer',
        amountCents: 17500,
        currency: 'AED',
        method: 'bank_transfer' as const,
        status: 'pending' as const,
        notes: 'Early payout request — school fees',
        createdBy: trainer._id,
        createdAt: now - 1 * DAY,
        updatedAt: now - 1 * DAY,
      });
      count('payouts', 2);
      const journal = [
        { kind: 'expense', category: 'Rent', cents: 4500000, daysAgo: 9 },
        { kind: 'expense', category: 'Payroll', cents: 6200000, daysAgo: 8 },
        { kind: 'expense', category: 'Utilities', cents: 310000, daysAgo: 7 },
        { kind: 'income', category: 'Café', cents: 184000, daysAgo: 2 },
        { kind: 'income', category: 'Salon', cents: 296000, daysAgo: 2 },
        { kind: 'expense', category: 'Supplies', cents: 88000, daysAgo: 3 },
      ] as const;
      for (const j of journal) {
        await ctx.db.insert('journalEntries', {
          entryDate: now - j.daysAgo * DAY,
          kind: j.kind as any,
          category: j.category,
          amountCents: j.cents,
          currency: 'AED',
          note: `Demo ${j.category}`,
          createdBy: owner._id,
          createdAt: now - j.daysAgo * DAY,
        });
        count('journalEntries', 1);
      }
    }

    // --- CRM -----------------------------------------------------------------
    const existingLeads = await ctx.db.query('crmLeads').take(1);
    if (existingLeads.length === 0) {
      const leads = [
        { name: 'Aisha Al-Rashid', phone: '+971521112233', stage: 'new', source: 'Instagram', notes: 'Asked about ladies-only hours' },
        { name: 'Sara Mahmoud', phone: '+971522223344', stage: 'contacted', source: 'Walk-in', notes: 'Tour done, wants PT pricing' },
        { name: 'Dana Khalil', phone: '+971523334455', stage: 'trial', source: 'Referral — Maryam', notes: 'Trial week ends Thursday' },
        { name: 'Lina Haddad', phone: '+971524445566', stage: 'converted', source: 'Website', notes: 'Converted to Premium' },
        { name: 'Mira Qasim', phone: '+971525556677', stage: 'lost', source: 'Facebook', notes: 'Chose a closer gym' },
      ] as const;
      for (let i = 0; i < leads.length; i++) {
        const l = at(leads, i);
        const lid = await ctx.db.insert('crmLeads', {
          name: l.name,
          phone: l.phone,
          source: l.source,
          stage: l.stage as any,
          notes: l.notes,
          assignedTo: ops._id,
          convertedUserId: l.stage === 'converted' ? at(members, 4)._id : undefined,
          lastContactAt: now - (i + 1) * DAY,
          createdBy: ops._id,
          createdAt: now - (i + 3) * DAY,
          updatedAt: now - (i + 1) * DAY,
        });
        count('crmLeads', 1);
        await ctx.db.insert('crmInteractions', {
          leadId: lid,
          authorId: ops._id,
          channel: i % 2 === 0 ? ('whatsapp' as const) : ('call' as const),
          summary: i === 0 ? 'Sent class schedule + trial offer' : 'Follow-up check-in',
          followUpAt: l.stage === 'new' || l.stage === 'contacted' ? now + 2 * DAY : undefined,
          createdAt: now - (i + 1) * DAY,
        });
        count('crmInteractions', 1);
      }
      await ctx.db.insert('crmTasks', {
        title: 'Call back trial leads before Thursday',
        notes: 'Dana trial ends Thursday — close or extend',
        assignedTo: ops._id,
        dueAt: now + 2 * DAY,
        status: 'open' as const,
        createdAt: now,
        updatedAt: now,
      });
      count('crmTasks', 1);
    }

    // --- documents ------------------------------------------------------------
    const existingDocs = await ctx.db.query('documentTemplates').take(1);
    if (existingDocs.length === 0) {
      const docs = [
        { type: 'membership_agreement', title: 'Membership Agreement v3', content: 'Membership terms and conditions…', required: true },
        { type: 'liability_waiver', title: 'Liability Waiver v2', content: 'Assumption of risk…', required: true },
        { type: 'health_declaration', title: 'Health Declaration v2', content: 'PAR-Q + health declaration…', required: true },
        { type: 'gym_rules', title: 'Gym Rules v1', content: 'Floor rules and etiquette…', required: false },
        { type: 'trainer_contract', title: 'Trainer Contract v1', content: 'Trainer engagement terms…', required: false },
      ] as const;
      for (const d of docs) {
        const tid = await ctx.db.insert('documentTemplates', {
          type: d.type as any,
          version: 'v1',
          title: d.title,
          content: d.content,
          required: d.required,
          effectiveDate: now - 180 * DAY,
        });
        count('documentTemplates', 1);
        if (d.required) {
          await ctx.db.insert('signatures', {
            userId: at(members, 0)._id,
            templateId: tid,
            documentVersion: 'v1',
            signedAt: now - 200 * DAY,
            signatureData: 'Maryam Al-Mansoori',
          });
          count('signatures', 1);
        }
      }
    }

    // --- demo top-up (runs every time) ---------------------------------------
    // The demo script consumes these states (confirm a pending salon booking,
    // advance a queued coffee order, void Priya's pending payment). Restore one
    // of each on every boot so the walkthrough can be replayed.
    if (!fresh) {
      const bookings = await ctx.db.query('salonBookings').collect();
      if (!bookings.some((b: any) => b.status === 'pending') && salonServices.length > 0) {
        await ctx.db.insert('salonBookings', {
          serviceId: at(salonServices, 0)._id,
          userId: at(members, 2)._id,
          startAt: now + DAY,
          status: 'pending',
          paymentMode: 'counter',
          createdAt: now,
        });
        count('salonBookingsToppedUp', 1);
      }
      const orders = await ctx.db.query('coffeeOrders').collect();
      if (!orders.some((o: any) => o.status === 'queued') && coffeeItems.length > 0) {
        const item = at(coffeeItems, 0);
        await ctx.db.insert('coffeeOrders', {
          userId: at(members, 1)._id,
          items: [{ itemId: item._id, qty: 1, unitPriceCents: item.priceCents }],
          totalCents: item.priceCents,
          status: 'queued',
          paymentMode: 'counter',
          createdAt: now,
        });
        count('coffeeOrdersToppedUp', 1);
      }
      const priya = at(members, 7);
      const priyaPays = await ctx.db
        .query('payments')
        .withIndex('by_user', (q: any) => q.eq('userId', priya._id))
        .collect();
      if (!priyaPays.some((p: any) => p.status === 'pending')) {
        await ctx.db.insert('payments', {
          userId: priya._id,
          amountCents: 49900,
          currency: 'AED',
          status: 'pending',
          type: 'membership',
          description: 'Premium monthly — Priya Nair (pending)',
          provider: 'stripe',
          idempotencyKey: `demo-priya-pending-${now}`,
          createdAt: now,
          updatedAt: now,
        });
        count('paymentsToppedUp', 1);
      }
    }

    return { ok: true, fresh, counts };
  },
});
