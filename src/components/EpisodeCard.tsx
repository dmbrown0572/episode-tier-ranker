import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { stillUrl } from '../tmdb';
import { TIERS, episodeKey, type Episode, type Tier } from '../types';

interface Props {
  episode: Episode;
  currentTier: Tier | null;
  onAssign: (key: string, tier: Tier | null) => void;
}

/** Static presentation, shared by the sortable card and the drag overlay. */
export function EpisodeCardBody({
  episode,
  dragging = false,
}: {
  episode: Episode;
  dragging?: boolean;
}) {
  const still = stillUrl(episode.stillPath);
  return (
    <div className={`card-body${dragging ? ' card-body--dragging' : ''}`}>
      {still ? (
        <img src={still} alt="" loading="lazy" className="card-still" />
      ) : (
        <div className="card-still card-still--empty">No image</div>
      )}
      <div className="card-caption">
        <span className="card-code">
          S{episode.season}E{episode.number}
        </span>
        <span className="card-title" title={episode.name}>
          {episode.name}
        </span>
      </div>
    </div>
  );
}

export function EpisodeCard({ episode, currentTier, onAssign }: Props) {
  const key = episodeKey(episode.season, episode.number);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: key,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card">
      <div
        {...attributes}
        {...listeners}
        className="card-grab"
        aria-label={`Season ${episode.season} episode ${episode.number}, ${episode.name}${
          currentTier ? `, currently ${currentTier} tier` : ', unranked'
        }`}
      >
        <EpisodeCardBody episode={episode} />
      </div>
      {/* Click-to-assign, so long shows can be ranked without dragging. */}
      <div className="card-quick">
        {TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            className={`quick-btn tier-bg-${tier}${currentTier === tier ? ' quick-btn--on' : ''}`}
            title={`Move S${episode.season}E${episode.number} to ${tier} tier`}
            onClick={() => onAssign(key, currentTier === tier ? null : tier)}
          >
            {tier}
          </button>
        ))}
        {currentTier && (
          <button
            type="button"
            className="quick-btn quick-btn--remove"
            title={`Remove S${episode.season}E${episode.number} from the ranking`}
            aria-label={`Remove S${episode.season}E${episode.number} from the ranking`}
            onClick={() => onAssign(key, null)}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
