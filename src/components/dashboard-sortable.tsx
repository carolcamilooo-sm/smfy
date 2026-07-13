"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { DashboardBlockKey } from "@/lib/dashboard-layout";

function SortableBlock({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90" : "relative"}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        className="absolute right-3 top-3 z-10 cursor-grab touch-none rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-secondary active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      {children}
    </div>
  );
}

export function DashboardSortable({
  order,
  blocks,
  saveOrder,
}: {
  order: DashboardBlockKey[];
  blocks: Record<DashboardBlockKey, ReactNode>;
  saveOrder: (order: DashboardBlockKey[]) => void;
}) {
  const [items, setItems] = useState(order);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.indexOf(active.id as DashboardBlockKey);
      const newIndex = current.indexOf(over.id as DashboardBlockKey);
      const next = [...current];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, active.id as DashboardBlockKey);
      saveOrder(next);
      return next;
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-8">
          {items.map((key) => (
            <SortableBlock key={key} id={key}>
              {blocks[key]}
            </SortableBlock>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
