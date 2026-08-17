import { useState } from 'react';

/**
 * TMDB's terms require the attribution notice to be visible in the app itself,
 * not just the docs. They also ask that their logo appear alongside it: drop
 * their SVG at `public/tmdb-logo.svg` and it shows up here automatically —
 * until then the notice renders as text only rather than as a broken image.
 */
export function Footer() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer className="footer">
      <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="footer-mark">
        {!logoFailed && (
          <img
            src="/tmdb-logo.svg"
            alt="TMDB"
            className="footer-logo"
            onError={() => setLogoFailed(true)}
          />
        )}
      </a>
      <p className="footer-note">
        This product uses the TMDB API but is not endorsed or certified by TMDB. Show and episode
        data and images are provided by{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          The Movie Database
        </a>
        .
      </p>
    </footer>
  );
}
