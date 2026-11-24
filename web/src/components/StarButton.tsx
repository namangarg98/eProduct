import { useState } from 'react';
import { MAX_FEATURED, useFeatured } from '../featured.tsx';

/** Marks a product as top rated. At most MAX_FEATURED can be starred (also enforced by the API). */
export function StarButton({ productId, title }: { productId: string; title: string }) {
  const { ids, toggle } = useFeatured();
  const [saving, setSaving] = useState(false);

  if (!ids) return null;
  const starred = ids.includes(productId);
  const full = !starred && ids.length >= MAX_FEATURED;
  const label = starred ? `Remove ${title} from top rated` : `Add ${title} to top rated`;

  return (
    <button
      type="button"
      className={`star${starred ? ' star--on' : ''}`}
      aria-pressed={starred}
      aria-label={label}
      title={full ? `Maximum ${MAX_FEATURED} top rated products` : label}
      disabled={full || saving}
      onClick={async () => {
        setSaving(true);
        await toggle(productId);
        setSaving(false);
      }}
    >
      {starred ? '★' : '☆'}
    </button>
  );
}
