import { useState } from 'react';
import { getApiKey, setApiKey } from '../tmdb';

interface Props {
  onSaved: () => void;
  onCancel?: () => void;
}

export function Settings({ onSaved, onCancel }: Props) {
  const [key, setKey] = useState(getApiKey());

  function save(event: React.FormEvent) {
    event.preventDefault();
    setApiKey(key);
    onSaved();
  }

  return (
    <form className="settings" onSubmit={save}>
      <h1 className="search-heading">TMDB API key</h1>
      <p className="search-sub">
        Episode data and images come from{' '}
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
          The Movie Database
        </a>
        . Sign up for a free account, request an API key, and paste it below. It is stored only in
        this browser.
      </p>
      <p className="muted">
        Prefer not to paste it every time? Put{' '}
        <code>VITE_TMDB_API_KEY=your_key</code> in a <code>.env</code> file at the project root and
        restart the dev server.
      </p>

      <input
        className="search-input"
        type="password"
        value={key}
        placeholder="TMDB API key (v3 auth) or read access token (v4)"
        onChange={(e) => setKey(e.target.value)}
        autoFocus
      />

      <div className="settings-actions">
        <button type="submit" className="btn btn--primary">
          Save key
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
