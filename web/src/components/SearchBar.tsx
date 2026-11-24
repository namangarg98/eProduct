import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MAX_LENGTH = 100;

/** Searches only when the button is clicked (or Enter pressed), per the acceptance criteria. */
export function SearchBar() {
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form role="search" className="search" onSubmit={handleSubmit}>
      <input
        className="input"
        type="search"
        aria-label="Search products"
        placeholder="Search products"
        maxLength={MAX_LENGTH}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      <button className="button" type="submit">
        Search
      </button>
    </form>
  );
}
