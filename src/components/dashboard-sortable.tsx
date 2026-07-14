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
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Columns2, Rows2 } from "lucide-react";
import type { DashboardBlockKey, DashboardBlockWidth } from "@/lib/dashboard-layout";

function SortableBlock({
  id,
  width,
  onToggleWidth,
  children,
}: {
  id: string;
  width: DashboardBlockWidth;
  onToggleWidth: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        (isDragging ? "relative z-10 opacity-90 " : "relative ") +
        (width === "full" ? "lg:col-span-2" : "lg:col-span-1")
      }
    >
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleWidth}
          aria-label={width === "full" ? "Diminuir para meia largura" : "Expandir para largura total"}
          title={width === "full" ? "Diminuir para meia largura" : "Expandir para largura total"}
          className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-secondary"
        >
          {width === "full" ? <Columns2 size={16} /> : <Rows2 size={16} />}
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
          className="cursor-grab touch-none rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function DashboardSortable({
  order,
  widths,
  blocks,
  saveOrder,
  saveWidth,
}: {
  order: DashboardBlockKey[];
  widths: Record<DashboardBlockKey, DashboardBlockWidth>;
  blocks: Record<DashboardBlockKey, ReactNode>;
  saveOrder: (order: DashboardBlockKey[]) => void;
  saveWidth: (key: DashboardBlockKey, width: DashboardBlockWidth) => void;
}) {
  const [items, setItems] = useState(order);
  const [blockWidths, setBlockWidths] = useState(widths);
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

  function handleToggleWidth(key: DashboardBlockKey) {
    const nextWidth: DashboardBlockWidth = blockWidths[key] === "full" ? "half" : "full";
    setBlockWidths((current) => ({ ...current, [key]: nextWidth }));
    saveWidth(key, nextWidth);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid auto-rows-min grid-cols-1 gap-4 lg:grid-cols-2 lg:[grid-auto-flow:dense]">
          {items.map((key) => (
            <SortableBlock
              key={key}
              id={key}
              width={blockWidths[key]}
              onToggleWidth={() => handleToggleWidth(key)}
            >
              {blocks[key]}
            </SortableBlock>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
