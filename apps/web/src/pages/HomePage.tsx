import { Activity, ArrowUpRight, House, PanelsTopLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { copy } from '../copy';
import { useScenes } from '../features/scenes/use-scenes';
import { getHealth } from '../lib/api-client';

export function HomePage() {
  const scenes = useScenes();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  const servicesConnected =
    health.data?.status === 'ok' &&
    health.data.database === 'connected' &&
    health.data.redis === 'connected';

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label={copy.brand.name}>
          <span className="brand-mark">
            <House size={19} strokeWidth={2.2} />
          </span>
          <span>{copy.brand.name}</span>
        </a>

        <div
          className="service-status"
          title={
            servicesConnected
              ? copy.status.connected
              : health.isLoading
                ? copy.status.checking
                : copy.status.unavailable
          }
          role="status"
          aria-live="polite"
        >
          <span className={`status-dot ${servicesConnected ? 'is-online' : 'is-offline'}`} />
          <span>
            {health.isLoading
              ? copy.status.checking
              : servicesConnected
                ? copy.status.connected
                : copy.status.unavailable}
          </span>
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">{copy.home.eyebrow.studySpace}</p>
          <h1>{copy.home.greeting}</h1>
          <p className="welcome-subtitle">{copy.home.subtitle}</p>
        </div>
        <div className="welcome-decoration" aria-hidden="true">
          <span>☁</span>
          <span>✳</span>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.home.eyebrow.spaces}</p>
            <h2>{copy.home.myRooms}</h2>
          </div>
          <span className="subtle-label">{copy.home.comingSoon}</span>
        </div>
        <div className="empty-card">
          <span className="empty-icon">
            <House size={22} />
          </span>
          <p>{copy.home.noRooms}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.home.eyebrow.together}</p>
            <h2>{copy.home.joinedRooms}</h2>
          </div>
          <span className="subtle-label">{copy.home.comingSoon}</span>
        </div>
        <div className="empty-card">
          <span className="empty-icon">
            <PanelsTopLeft size={22} />
          </span>
          <p>{copy.home.noJoinedRooms}</p>
        </div>
      </section>

      <section className="section scene-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.home.eyebrow.setMood}</p>
            <h2>{copy.home.chooseScene}</h2>
            <p className="section-description">{copy.home.chooseSceneDescription}</p>
          </div>
          <span className="scene-count">
            <Activity size={15} />
            {scenes.data?.length ?? 0}
          </span>
        </div>

        {scenes.isPending && (
          <div className="scene-grid" aria-live="polite">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="scene-skeleton" key={index} />
            ))}
          </div>
        )}

        {scenes.isError && (
          <div className="feedback-card" role="alert">
            <p>{copy.home.sceneError}</p>
            <button className="text-button" onClick={() => void scenes.refetch()} type="button">
              {copy.home.retry}
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}

        {scenes.isSuccess && scenes.data.length === 0 && (
          <div className="feedback-card">
            <p>{copy.home.emptyScenes}</p>
          </div>
        )}

        {scenes.isSuccess && scenes.data.length > 0 && (
          <div className="scene-grid">
            {scenes.data.map((scene) => (
              <article className="scene-card" key={scene.id}>
                <div className="scene-image-wrap">
                  <img className="scene-image" src={scene.thumbnailUrl} alt="" loading="lazy" />
                  <span className="scene-category">{scene.category}</span>
                </div>
                <div className="scene-card-footer">
                  <h3>{scene.name}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <span>{copy.brand.name}</span>
        <span>{copy.brand.tagline}</span>
      </footer>
    </main>
  );
}
