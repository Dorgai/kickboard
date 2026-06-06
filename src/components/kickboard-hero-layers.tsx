type KickboardHeroLayersProps = {
  /** Crossfade between Yamal and Nico Williams portraits on the home feed. */
  dual?: boolean;
};

export function KickboardHeroLayers({ dual = false }: KickboardHeroLayersProps) {
  return (
    <div
      aria-hidden
      className={`kickboard-hero-layers${dual ? " kickboard-hero-layers--dual" : ""}`}
    >
      {dual ? <div className="kickboard-hero-photo kickboard-hero-photo--alt" /> : null}
    </div>
  );
}
