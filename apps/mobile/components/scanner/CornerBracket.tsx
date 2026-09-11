import React from "react"
import { YStack } from "tamagui"

export function CornerBracket({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br"
}) {
  const size = 24
  const offset = 8
  const isTop = position === "tl" || position === "tr"
  const isLeft = position === "tl" || position === "bl"
  return (
    <YStack
      position="absolute"
      top={isTop ? offset : undefined}
      bottom={!isTop ? offset : undefined}
      left={isLeft ? offset : undefined}
      right={!isLeft ? offset : undefined}
      width={size}
      height={size}
      borderColor="$brand"
      borderTopWidth={isTop ? 4 : 0}
      borderBottomWidth={!isTop ? 4 : 0}
      borderLeftWidth={isLeft ? 4 : 0}
      borderRightWidth={!isLeft ? 4 : 0}
      borderTopLeftRadius={isTop && isLeft ? "$sm" : 0}
      borderTopRightRadius={isTop && !isLeft ? "$sm" : 0}
      borderBottomLeftRadius={!isTop && isLeft ? "$sm" : 0}
      borderBottomRightRadius={!isTop && !isLeft ? "$sm" : 0}
      zIndex={3}
    />
  )
}
