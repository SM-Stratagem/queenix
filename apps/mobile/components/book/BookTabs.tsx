import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { Text, Card, Chip, Skeleton, ErrorState, EmptyState } from '@queenix/ui';
import { ClassCard, TrainerCard } from './BookCards';
import type { ClassCategory, ClassView, TrainerView } from './types';

const CATEGORIES: ClassCategory[] = ['All', 'HIIT', 'Yoga', 'Strength', 'Cardio', 'Pilates'];

export function ClassesTab({
  category,
  onCategory,
  isLoadingClasses,
  classesError,
  filteredClasses,
  bookingId,
  onOpenClass,
  onBook,
}: {
  category: ClassCategory;
  onCategory: (c: ClassCategory) => void;
  isLoadingClasses: boolean;
  classesError: boolean;
  filteredClasses: ClassView[];
  bookingId: string | null;
  onOpenClass: (cls: ClassView) => void;
  onBook: (cls: ClassView) => void;
}) {
  return (
<YStack>
  {/* Category filter */}
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
  >
    {CATEGORIES.map((cat) => (
      <Chip
        key={cat}
        label={cat}
        selected={category === cat}
        variant={category === cat ? 'brand' : 'default'}
        onPress={() => onCategory(cat)}
      />
    ))}
  </ScrollView>

  <YStack paddingHorizontal="$4" marginTop="$3" gap="$3">
    {isLoadingClasses ? (
      <YStack gap="$3">
        {[0, 1, 2].map((i) => (
          <Card key={i} variant="elevated" padding="md">
            <YStack gap="$2">
              <Skeleton width="100%" height={120} borderRadius={16} />
              <Skeleton width="60%" height={18} />
              <Skeleton width="40%" height={14} />
            </YStack>
          </Card>
        ))}
      </YStack>
    ) : classesError ? (
      <ErrorState
        title="Could not load classes"
        message="We had trouble fetching the schedule."
        onRetry={() => {
          /* Convex auto-revalidates */
        }}
      />
    ) : (
      <>
        <Text variant="caption" color="muted">
          {filteredClasses.length} class{filteredClasses.length === 1 ? '' : 'es'} available
        </Text>
        {filteredClasses.length === 0 ? (
          <EmptyState
            title="No classes in this category"
            message="Try a different filter or check back soon."
          />
        ) : (
          filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              busy={bookingId === cls.id}
              onPress={() => onOpenClass(cls)}
              onBook={() => onBook(cls)}
            />
          ))
        )}
      </>
    )}
  </YStack>
</YStack>
  );
}

export function TrainersTab({
  isLoadingTrainers,
  trainersError,
  trainers,
  onOpenTrainer,
}: {
  isLoadingTrainers: boolean;
  trainersError: boolean;
  trainers: TrainerView[];
  onOpenTrainer: () => void;
}) {
  return (
<YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
  {isLoadingTrainers ? (
    <YStack gap="$3">
      {[0, 1].map((i) => (
        <Card key={i} variant="outlined" padding="md">
          <XStack gap="$3">
            <Skeleton width={48} height={48} circle />
            <YStack flex={1} gap="$1">
              <Skeleton width="50%" height={16} />
              <Skeleton width="70%" height={12} />
              <Skeleton width="80%" height={12} />
            </YStack>
          </XStack>
        </Card>
      ))}
    </YStack>
  ) : trainersError ? (
    <ErrorState
      title="Could not load trainers"
      message="Please try again in a moment."
      onRetry={() => {
        /* Convex auto-revalidates */
      }}
    />
  ) : trainers.length === 0 ? (
    <EmptyState
      title="No trainers available"
      message="Check back soon for new coaching talent."
    />
  ) : (
    <>
      <Text variant="caption" color="muted">
        {trainers.length} certified trainer{trainers.length === 1 ? '' : 's'}
      </Text>
      {trainers.map((trainer) => (
        <TrainerCard
          key={trainer.id}
          trainer={trainer}
          onPress={onOpenTrainer}
        />
      ))}
    </>
  )}
</YStack>
  );
}
