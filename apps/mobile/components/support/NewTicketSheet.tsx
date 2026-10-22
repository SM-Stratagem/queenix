import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Avatar, Badge, Button, Input, Sheet } from '@queenix/ui';
import { Search } from '@tamagui/lucide-icons-2';
import type { Member } from './MemberRow';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type Category = 'billing' | 'access' | 'class' | 'general';

const CATEGORIES: Category[] = ['billing', 'access', 'class', 'general'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

export function NewTicketSheet({
  open,
  onOpenChange,
  memberQuery,
  setMemberQuery,
  selectedMember,
  setSelectedMember,
  filtered,
  category,
  setCategory,
  priority,
  setPriority,
  subject,
  setSubject,
  description,
  setDescription,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberQuery: string;
  setMemberQuery: (v: string) => void;
  selectedMember: Member | null;
  setSelectedMember: (m: Member | null) => void;
  filtered: Member[];
  category: Category;
  setCategory: (c: Category) => void;
  priority: Priority;
  setPriority: (p: Priority) => void;
  subject: string;
  setSubject: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <YStack gap="$3">
        <YStack gap="$0.5" marginBottom="$1">
          <Text variant="h2">New support ticket</Text>
          <Text variant="bodySmall" color="secondary">
            Logged for operations follow-up
          </Text>
        </YStack>

        {/* Member picker */}
        <YStack gap="$1">
          <Text variant="caption" color="secondary" fontWeight="600">
            Member
          </Text>
          <Input
            placeholder="Search member name or ID"
            value={selectedMember?.name ?? memberQuery}
            onChangeText={(v: string) => {
              setMemberQuery(v);
              setSelectedMember(null);
            }}
            leftIcon={<Search size={16} color="$textMuted" />}
            aria-label="Member name or ID"
          />
          {memberQuery.length > 0 && !selectedMember && (
            <YStack gap="$1" marginTop="$1">
              {filtered.slice(0, 4).map((m) => (
                <Card
                  key={m.id}
                  variant="outlined"
                  padding="sm"
                  onPress={() => {
                    setSelectedMember(m);
                    setMemberQuery('');
                  }}
                >
                  <XStack alignItems="center" gap="$2">
                    <Avatar name={m.name} size="sm" fallbackColor="$brand" />
                    <YStack flex={1}>
                      <Text variant="label" numberOfLines={1}>{m.name}</Text>
                      <Text variant="caption" color="muted">
                        {m.tier} • {m.visits} visits
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              ))}
              {filtered.length === 0 && (
                <Text variant="caption" color="muted">No matches — leave blank for walk-in.</Text>
              )}
            </YStack>
          )}
          {selectedMember && (
            <XStack alignItems="center" gap="$2" marginTop="$1">
              <Badge label={`Selected: ${selectedMember.name}`} variant="info" />
              <Button
                label="Clear"
                variant="ghost"
                size="sm"
                onPress={() => setSelectedMember(null)}
              />
            </XStack>
          )}
        </YStack>

        <YStack gap="$1">
          <Text variant="caption" color="secondary" fontWeight="600">
            Category
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Card
                  key={c}
                  variant={active ? 'elevated' : 'outlined'}
                  padding="sm"
                  onPress={() => setCategory(c)}
                  backgroundColor={active ? '$brand50' : undefined}
                  accessibilityLabel={`Category ${c}`}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    textTransform="capitalize"
                    color={active ? 'brand' : 'primary'}
                  >
                    {c}
                  </Text>
                </Card>
              );
            })}
          </XStack>
        </YStack>
        <YStack gap="$1">
          <Text variant="caption" color="secondary" fontWeight="600">
            Priority
          </Text>
          <XStack gap="$2">
            {PRIORITIES.map((p) => {
              const active = priority === p;
              return (
                <Card
                  key={p}
                  variant={active ? 'elevated' : 'outlined'}
                  padding="sm"
                  flex={1}
                  onPress={() => setPriority(p)}
                  backgroundColor={
                    active
                      ? p === 'critical'
                        ? '$danger50'
                        : p === 'high'
                        ? '$warning50'
                        : '$brand50'
                      : undefined
                  }
                  accessibilityLabel={`Priority ${p}`}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    textTransform="capitalize"
                    textAlign="center"
                    color={
                      active
                        ? p === 'critical'
                          ? 'danger'
                          : p === 'high'
                          ? 'warning'
                          : 'brand'
                        : 'primary'
                    }
                  >
                    {p}
                  </Text>
                </Card>
              );
            })}
          </XStack>
        </YStack>
        <Input
          label="Subject"
          placeholder="Brief description"
          value={subject}
          onChangeText={setSubject}
          aria-label="Ticket subject"
        />
        <YStack gap="$1">
          <Text variant="caption" color="secondary" fontWeight="600">
            Details
          </Text>
          <YStack
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$md"
            padding="$3"
            backgroundColor="$surface"
            minHeight={120}
          >
            <textarea
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="What happened? Any context for the team?"
              style={{
                width: '100%',
                minHeight: 100,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 14,
                color: 'inherit',
                fontFamily: 'inherit',
                resize: 'none',
              }}
              aria-label="Ticket details"
            />
          </YStack>
        </YStack>
        <Button
          label="Log ticket"
          variant="primary"
          size="md"
          fullWidth
          onPress={onSubmit}
          accessibilityLabel="Log new ticket"
        />
      </YStack>
    </Sheet>
  );
}
