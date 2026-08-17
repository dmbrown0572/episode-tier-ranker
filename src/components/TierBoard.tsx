import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { EpisodeCard, EpisodeCardBody } from './EpisodeCard';
import {
  TIERS,
  episodeKey,
  type Episode,
  type EpisodeKey,
  type Tier,
  type TierList,
} from '../types';

const UNRANKED = 'UNRANKED';

/**
 * Drops land on whatever is under the cursor. `closestCenter` compares centres
 * instead, which on this board lets a card in a neighbouring row win over the
 * row the pointer is actually inside — dropping on an empty S row would file
 * the episode under A. Rect intersection covers the gap between rows, and
 * closestCenter is the last resort once the pointer leaves the board entirely.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  const rectHits = rectIntersection(args);
  return rectHits.length > 0 ? rectHits : closestCenter(args);
};

interface Props {
  episodes: Episode[];
  list: TierList;
  /**
   * Takes an updater rather than a value: several assignments can land in one
   * React batch (rapid clicking, key repeat), and each must build on the last
   * rather than on a stale render's placements.
   */
  onChange: (updater: (prev: TierList) => TierList) => void;
}

export function TierBoard({ episodes, list, onChange }: Props) {
  const [activeKey, setActiveKey] = useState<EpisodeKey | null>(null);

  const sensors = useSensors(
    // A small distance threshold keeps the quick-assign buttons clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byKey = useMemo(() => {
    const map = new Map<EpisodeKey, Episode>();
    for (const ep of episodes) map.set(episodeKey(ep.season, ep.number), ep);
    return map;
  }, [episodes]);

  /** Tier membership, restricted to episodes currently loaded. */
  const tierOf = useMemo(() => {
    const map = new Map<EpisodeKey, Tier>();
    for (const tier of TIERS) {
      for (const key of list.placements[tier]) {
        if (byKey.has(key)) map.set(key, tier);
      }
    }
    return map;
  }, [list, byKey]);

  /** Unranked is derived, not stored, so it always stays in broadcast order. */
  const unranked = useMemo(
    () => episodes.map((e) => episodeKey(e.season, e.number)).filter((k) => !tierOf.has(k)),
    [episodes, tierOf],
  );

  const itemsIn = (container: string): EpisodeKey[] =>
    container === UNRANKED
      ? unranked
      : list.placements[container as Tier].filter((k) => byKey.has(k));

  const containerOf = (key: EpisodeKey): string => tierOf.get(key) ?? UNRANKED;

  /**
   * Removes `key` everywhere, then inserts it into `target` just before
   * `beforeKey` (or at the end when null). Anchoring on a neighbouring key
   * rather than an index keeps ordering correct while a season filter is
   * hiding some of the episodes already placed in that tier.
   */
  function move(key: EpisodeKey, target: string, beforeKey: EpisodeKey | null) {
    onChange((prev) => {
      const placements = { ...prev.placements };
      for (const tier of TIERS) {
        placements[tier] = placements[tier].filter((k) => k !== key);
      }
      if (target !== UNRANKED) {
        const tier = target as Tier;
        const next = [...placements[tier]];
        const at = beforeKey === null ? -1 : next.indexOf(beforeKey);
        next.splice(at < 0 ? next.length : at, 0, key);
        placements[tier] = next;
      }
      return { ...prev, placements };
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveKey(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveKey(null);
    const { active, over } = event;
    if (!over) return;

    const key = String(active.id);
    const overId = String(over.id);
    if (overId === key) return;

    // Dropping on a container appends; dropping on a card inserts at its slot.
    const isContainer = overId === UNRANKED || TIERS.includes(overId as Tier);
    const target = isContainer ? overId : containerOf(overId);
    move(key, target, isContainer ? null : overId);
  }

  function handleAssign(key: EpisodeKey, tier: Tier | null) {
    move(key, tier ?? UNRANKED, null);
  }

  const activeEpisode = activeKey ? byKey.get(activeKey) : null;
  const rankedCount = episodes.length - unranked.length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveKey(null)}
    >
      <div className="board">
        {TIERS.map((tier) => (
          <Container
            key={tier}
            id={tier}
            label={tier}
            className={`tier-row tier-bg-${tier}`}
            items={itemsIn(tier)}
            byKey={byKey}
            tierOf={tierOf}
            onAssign={handleAssign}
          />
        ))}
      </div>

      <section className="pool">
        <h2 className="pool-heading">
          Unranked
          <span className="pool-count">
            {rankedCount} of {episodes.length} ranked
          </span>
        </h2>
        <Container
          id={UNRANKED}
          label={null}
          className="pool-drop"
          items={unranked}
          byKey={byKey}
          tierOf={tierOf}
          onAssign={handleAssign}
        />
      </section>

      <DragOverlay>
        {activeEpisode ? <EpisodeCardBody episode={activeEpisode} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

interface ContainerProps {
  id: string;
  label: string | null;
  className: string;
  items: EpisodeKey[];
  byKey: Map<EpisodeKey, Episode>;
  tierOf: Map<EpisodeKey, Tier>;
  onAssign: (key: EpisodeKey, tier: Tier | null) => void;
}

function Container({ id, label, className, items, byKey, tierOf, onAssign }: ContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={className}>
      {label !== null && <div className="tier-label">{label}</div>}
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={`drop-zone${isOver ? ' drop-zone--over' : ''}`}>
          {items.length === 0 && <span className="drop-hint">Drop episodes here</span>}
          {items.map((key) => {
            const episode = byKey.get(key);
            if (!episode) return null;
            return (
              <EpisodeCard
                key={key}
                episode={episode}
                currentTier={tierOf.get(key) ?? null}
                onAssign={onAssign}
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}
