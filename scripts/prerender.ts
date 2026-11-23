import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

interface RouteConfig {
  path: string;
  title: string;
  description: string;
  renderComponent: (modules: any) => React.ReactElement;
}

async function prerender() {
  console.log('🚀 Starting build-time static HTML prerendering...');

  const templatePath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`dist/index.html not found at ${templatePath}. Run vite build first.`);
  }

  const baseTemplate = fs.readFileSync(templatePath, 'utf-8');

  // Create custom Vite SSR runner
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: rootDir
  });

  try {
    // Load components through Vite SSR pipeline
    const landingMod = await vite.ssrLoadModule('/src/components/LandingPage.tsx');
    const servicesMod = await vite.ssrLoadModule('/src/components/ServicesPage.tsx');
    const doctorsMod = await vite.ssrLoadModule('/src/components/FindDoctorPage.tsx');
    const hospitalsMod = await vite.ssrLoadModule('/src/components/HospitalList.tsx');
    const aboutMod = await vite.ssrLoadModule('/src/components/AboutUs.tsx');
    const contactMod = await vite.ssrLoadModule('/src/components/ContactUs.tsx');

    const LandingPage = landingMod.LandingPage;
    const ServicesPage = servicesMod.ServicesPage;
    const FindDoctorPage = doctorsMod.FindDoctorPage;
    const HospitalList = hospitalsMod.HospitalList;
    const AboutUs = aboutMod.AboutUs;
    const ContactUs = contactMod.ContactUs;

    const routes: RouteConfig[] = [
      {
        path: '/',
        title: 'Olmera – Book specialists and manage your medical records',
        description: 'Find trusted specialists, book appointments and keep your medical records secure in one place.',
        renderComponent: () => React.createElement(LandingPage, {
          onOpenAuth: () => {},
          onNavigateToView: () => {}
        })
      },
      {
        path: '/services',
        title: 'Clinical Services – Olmera Healthcare',
        description: 'Comprehensive outpatient care, 24/7 emergency response, diagnostic imaging, and telemedicine across Andhra Pradesh.',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('main', { id: 'main-content' },
              React.createElement(ServicesPage)
            )
          )
        )
      },
      {
        path: '/doctors',
        title: 'Find a Specialist – Olmera Healthcare',
        description: 'Search accredited specialists across cardiology, pediatrics, neurology, and internal medicine in Rajam, Vizag, and Srikakulam.',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('main', { id: 'main-content' },
            React.createElement(FindDoctorPage, {
              onBack: () => {},
              onSelectDoctor: () => {}
            })
          )
        )
      },
      {
        path: '/hospitals',
        title: 'Network Hospitals & Bed Availability – Olmera Healthcare',
        description: 'Real-time bed availability and facility directory across our accredited hospital network in Andhra Pradesh.',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('main', { id: 'main-content' },
            React.createElement(HospitalList, {
              onBack: () => {},
              onSelectHospital: () => {}
            })
          )
        )
      },
      {
        path: '/about-us',
        title: 'About Us – Olmera Healthcare',
        description: 'Quiet innovation for modern healthcare. Connecting patients, clinical specialists, and hospital networks.',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('main', { id: 'main-content' },
              React.createElement(AboutUs)
            )
          )
        )
      },
      {
        path: '/about',
        title: 'About Us – Olmera Healthcare',
        description: 'Quiet innovation for modern healthcare. Connecting patients, clinical specialists, and hospital networks.',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('main', { id: 'main-content' },
              React.createElement(AboutUs)
            )
          )
        )
      },
      {
        path: '/contact-us',
        title: 'Contact Us & Emergency Helplines – Olmera Healthcare',
        description: 'Reach the Olmera clinical care concierge or connect with 24/7 emergency trauma dispatch (Dial 108).',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('main', { id: 'main-content' },
              React.createElement(ContactUs)
            )
          )
        )
      },
      {
        path: '/contact',
        title: 'Contact Us & Emergency Helplines – Olmera Healthcare',
        description: 'Reach the Olmera clinical care concierge or connect with 24/7 emergency trauma dispatch (Dial 108).',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('main', { id: 'main-content' },
              React.createElement(ContactUs)
            )
          )
        )
      },
      {
        path: '/privacy',
        title: 'Privacy & Clinical Data Charter – Olmera Healthcare',
        description: 'HIPAA and NABH compliant healthcare data protection and encrypted electronic health records.',
        renderComponent: () => React.createElement('div', { className: 'min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8' },
          React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('main', { id: 'main-content' },
              React.createElement(AboutUs)
            )
          )
        )
      }
    ];

    for (const route of routes) {
      console.log(`  → Prerendering ${route.path}...`);
      const element = route.renderComponent({ LandingPage, ServicesPage, FindDoctorPage, HospitalList, AboutUs, ContactUs });
      const bodyHtml = renderToString(element);

      const canonicalUrl = `https://olmera.health${route.path === '/' ? '/' : route.path}`;

      const routeHtml = baseTemplate
        .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
        .replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${route.description}" />`)
        .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${canonicalUrl}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonicalUrl}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${route.title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${route.description}" />`)
        .replace(/<meta name="twitter:url" content=".*?" \/>/, `<meta name="twitter:url" content="${canonicalUrl}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${route.title}" />`)
        .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${route.description}" />`);

      let targetFile: string;
      if (route.path === '/') {
        targetFile = path.resolve(distDir, 'index.html');
      } else {
        const routeDir = path.resolve(distDir, route.path.replace(/^\//, ''));
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        targetFile = path.resolve(routeDir, 'index.html');
      }

      fs.writeFileSync(targetFile, routeHtml, 'utf-8');
      console.log(`    ✓ Wrote ${path.relative(distDir, targetFile)} (${routeHtml.length} chars)`);
    }

    console.log('✅ Build-time static HTML prerendering complete!');
  } finally {
    await vite.close();
  }
}

prerender().catch((err) => {
  console.error('❌ Prerender script failed:', err);
  process.exit(1);
});
