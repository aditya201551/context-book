import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../landing.css';
import LandingNavBar from './LandingNavBar';
import LandingHero from './LandingHero';
import LandingDemo from './LandingDemo';
import LandingArchitecture from './LandingArchitecture';
import LandingConstellation from './LandingConstellation';
import LandingCapabilities from './LandingCapabilities';
import LandingInstall from './LandingInstall';
import LandingStack from './LandingStack';
import LandingPrinciples from './LandingPrinciples';
import LandingCTA from './LandingCTA';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  const navigate = useNavigate();

  // Enable body scroll for landing page, restore hidden on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Scroll-reveal observer
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.landing-page .reveal').forEach((el) => obs.observe(el));

    // keyboard "/" focuses the constellation search
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        const input = document.querySelector('.landing-page .const-search input') as HTMLInputElement | null;
        if (input) {
          e.preventDefault();
          input.focus();
          input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { obs.disconnect(); window.removeEventListener('keydown', onKey); };
  }, []);

  const handleOpenLibrary = () => navigate('/login');

  return (
    <div className="landing-page">
      <LandingNavBar onOpenLibrary={handleOpenLibrary} />
      <main id="top">
        <LandingHero onOpenLibrary={handleOpenLibrary} />
        <div className="divider-meander reveal"></div>
        <LandingDemo />
        <LandingArchitecture />
        <LandingConstellation />
        <LandingCapabilities />
        <LandingInstall />
        <LandingStack />
        <LandingPrinciples />
        <LandingCTA onOpenLibrary={handleOpenLibrary} />
      </main>
      <LandingFooter />
    </div>
  );
}
