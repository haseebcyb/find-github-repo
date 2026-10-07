import React, { useState } from 'react';
import { Send, CheckCircle2, Mail } from 'lucide-react';
import { CATEGORIES, DIRECTORY_ENTRIES } from '../data/directoryData';
import { BUNDLED_SHOWCASE_IMAGES, FREE_SOURCE_FALLBACK_IMAGES } from '../imageAssets';

interface AboutViewProps {
  onNavigate: (page: string) => void;
}

const DEVELOPER_EMAIL = 'ohmllghothak@gmail.com';

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [subject, setSubject] = useState('Repository Submission / Technical Query');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    ok: boolean;
    text: string;
    mailtoUrl?: string;
  } | null>(null);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    setSubmitStatus(null);

    const bodyLines = [
      `Name: ${name.trim()}`,
      `Reply Email: ${email.trim()}`,
      websiteUrl.trim() ? `Website URL: ${websiteUrl.trim()}` : '',
      '',
      'Message / Query:',
      message.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    const mailtoUrl = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(
      subject.trim() || 'Website -> GitHub Finder Query'
    )}&body=${encodeURIComponent(bodyLines)}`;

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          websiteUrl: websiteUrl.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmitStatus({
          ok: true,
          text: `Your query has been logged for developer ${DEVELOPER_EMAIL}. You can also click below to dispatch it directly via your email client.`,
          mailtoUrl,
        });
        setMessage('');
      } else {
        setSubmitStatus({
          ok: false,
          text: data.error || 'Could not submit query. Please use the direct email link.',
          mailtoUrl,
        });
      }
    } catch {
      setSubmitStatus({
        ok: true,
        text: `Query prepared for ${DEVELOPER_EMAIL}. Click the button below to send via your email client.`,
        mailtoUrl,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8 space-y-12">
      {/* Bold Editorial Header Banner with Security Verification Vault Image */}
      <div className="bg-slate-50 border-2 border-slate-900 border-t-4 border-t-[#8B0000] rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-blue-800 mb-1.5">
              Platform Architecture · Technical Stack · Developer Contact
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-950 mb-2">
              About Website → GitHub Finder &amp; Developer Query Desk
            </h1>
            <p className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed max-w-3xl">
              Built by pkfinder company, Website → GitHub Finder is a full-stack
              technical discovery platform and multi-signal analysis engine that
              identifies publicly available GitHub repositories associated with
              production websites.
            </p>
          </div>
          <div className="lg:col-span-4 bg-slate-950 relative min-h-[170px] border-t-2 lg:border-t-0 lg:border-l-2 border-slate-900 overflow-hidden">
            <img
              src={BUNDLED_SHOWCASE_IMAGES.securityVault}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== FREE_SOURCE_FALLBACK_IMAGES.securityVault) {
                  target.src = FREE_SOURCE_FALLBACK_IMAGES.securityVault;
                }
              }}
              alt="Security Verification and Multi-Signal Architecture"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-xs font-mono text-white">
              <div className="text-red-400 font-bold">VERIFICATION ARCHITECTURE</div>
              <div className="text-white font-bold">SSRF Guard + 9-Rule Scoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: User Query Form & Direct Developer Contact (ohmllghothak@gmail.com) */}
      <section
        id="query-form"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10 border-b-2 border-slate-900"
      >
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-mono font-bold text-[#8B0000] uppercase">
            Ask a Question or Submit a Website
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-950">
            User Query &amp; Developer Support Form
          </h2>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            Have a question about how a repository was matched, want to submit a
            new open-source website to the directory, or need technical support?
            Send a query directly to our lead developer.
          </p>

          <div className="p-5 bg-slate-50 border-2 border-slate-900 border-l-8 border-l-blue-800 rounded-sm space-y-2 text-xs">
            <div className="font-bold text-slate-950 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8B0000]" />
              <span>Direct Developer Email</span>
            </div>
            <div className="font-mono text-sm font-bold text-blue-800">
              <a href={`mailto:${DEVELOPER_EMAIL}`} className="hover:underline">
                {DEVELOPER_EMAIL}
              </a>
            </div>
            <p className="text-slate-700 font-semibold">
              All queries submitted through this form are routed to{' '}
              <span className="font-mono font-bold text-slate-950">
                {DEVELOPER_EMAIL}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border-2 border-slate-900 border-t-4 border-t-[#8B0000] rounded-sm p-6">
          <h3 className="text-lg font-display font-extrabold text-slate-950 mb-4 pb-2.5 border-b-2 border-slate-900">
            Submit a Query to Developer ({DEVELOPER_EMAIL})
          </h3>

          <form onSubmit={handleQuerySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-950 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-sm text-slate-950 font-semibold focus:outline-none focus:border-blue-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-950 mb-1">
                  Your Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-sm text-slate-950 font-mono font-bold focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-950 mb-1">
                  Query Topic / Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-sm text-slate-950 font-bold focus:outline-none focus:border-blue-800"
                >
                  <option value="Repository Submission / Technical Query">
                    Repository Submission / Directory Addition
                  </option>
                  <option value="Question About Repository Match Score">
                    Question About Repository Match Score
                  </option>
                  <option value="Bug Report or Feature Request">
                    Bug Report or Feature Request
                  </option>
                  <option value="General Developer Inquiry">
                    General Developer Inquiry
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-950 mb-1">
                  Related Website URL (Optional)
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-sm text-slate-950 font-mono font-bold focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-950 mb-1">
                Your Question or Message *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your query, website URL details, or feedback for ohmllghothak@gmail.com..."
                className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-sm text-slate-950 font-semibold focus:outline-none focus:border-blue-800"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="font-mono font-bold text-slate-700">
                Recipient: {DEVELOPER_EMAIL}
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="btn-crimson px-5 py-2.5 rounded-sm text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting Query...' : 'Submit Query'}</span>
              </button>
            </div>
          </form>

          {submitStatus && (
            <div className="mt-4 p-4 rounded-sm border-2 border-slate-900 bg-slate-50 text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-slate-950 font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#8B0000] shrink-0 mt-0.5" />
                <span>{submitStatus.text}</span>
              </div>
              {submitStatus.mailtoUrl && (
                <div>
                  <a
                    href={submitStatus.mailtoUrl}
                    className="btn-royal inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-white font-bold"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Email Client ({DEVELOPER_EMAIL})</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Overview of How the Website Works & Languages Used */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10 border-b-2 border-slate-900">
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono font-bold text-[#8B0000] uppercase">
            System Architecture &amp; Languages Used
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-950">
            How This Website Works &amp; Technology Stack
          </h2>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            Website → GitHub Finder is engineered as a full-stack TypeScript
            application combining an Express.js server-side inspection pipeline with
            a responsive React 19 discovery interface.
          </p>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 card-editorial rounded-sm space-y-1.5">
            <div className="font-mono font-bold text-[#8B0000]">
              1. Languages &amp; Frontend Stack
            </div>
            <p className="text-slate-800 font-semibold leading-relaxed">
              Written in <strong>TypeScript</strong>, <strong>HTML5</strong>, and{' '}
              <strong>CSS3 (Tailwind CSS v4)</strong> using <strong>React 19</strong>{' '}
              and <strong>Vite</strong>. Data visualizations use{' '}
              <strong>Recharts</strong>, with <strong>Playfair Display</strong> &amp;{' '}
              <strong>Poppins</strong> typography.
            </p>
          </div>

          <div className="p-4 card-editorial rounded-sm space-y-1.5">
            <div className="font-mono font-bold text-blue-800">
              2. Backend Server &amp; Security
            </div>
            <p className="text-slate-800 font-semibold leading-relaxed">
              Powered by <strong>Node.js</strong> and <strong>Express.js</strong>{' '}
              (`server.ts`). Uses Node&apos;s native `dns/promises` and `net`
              modules to validate domains and block SSRF/private IP ranges before
              fetching HTML.
            </p>
          </div>

          <div className="p-4 card-editorial rounded-sm space-y-1.5">
            <div className="font-mono font-bold text-[#8B0000]">
              3. Public HTML Signal Extraction
            </div>
            <p className="text-slate-800 font-semibold leading-relaxed">
              Safely streams up to 600KB of public HTML markup to extract `&lt;meta&gt;`
              tags, OpenGraph properties, framework signatures, and direct links to
              GitHub, GitLab, Bitbucket, or Codeberg.
            </p>
          </div>

          <div className="p-4 card-editorial rounded-sm space-y-1.5">
            <div className="font-mono font-bold text-blue-800">
              4. GitHub REST API Verification
            </div>
            <p className="text-slate-800 font-semibold leading-relaxed">
              Queries the official <strong>GitHub REST API</strong> server-side to
              verify repository homepages, README domain references, stars, forks,
              and licenses, caching results for fast repeat lookups.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Multi-Signal Scoring Specification Table */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-2xl font-display font-extrabold text-slate-950">
            Multi-Signal Matching Algorithm
          </h2>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            When a user enters a website URL, the platform inspects public HTML
            metadata, OpenGraph tags, framework markers, and direct repository links
            before cross-referencing the GitHub REST API.
          </p>
          <p className="text-xs font-semibold text-slate-700 leading-relaxed">
            Repositories that only match weak keywords or appear to be unofficial
            third-party clones (`awesome-*`) are penalized and filtered out.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('find')}
              className="btn-royal px-4 py-2 text-xs font-bold rounded-sm text-white cursor-pointer"
            >
              <span>Launch Live Analyzer →</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 border-2 border-slate-900 rounded-sm bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="bg-slate-950 text-white border-b-2 border-slate-900">
                <th className="py-3 px-4 font-bold text-white">Signal Tier</th>
                <th className="py-3 px-4 font-bold text-white">Verification Rule</th>
                <th className="py-3 px-4 font-bold text-right text-white">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2.5 px-4 text-[#8B0000] font-bold">Very Strong</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Website HTML directly links to `github.com/owner/repository`
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-[#8B0000]">
                  +50 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-[#8B0000] font-bold">Very Strong</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Repository homepage field or repository name matches exact domain
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-[#8B0000]">
                  +30 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-[#8B0000] font-bold">Very Strong</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Repository README explicitly references the website domain
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-[#8B0000]">
                  +25 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-[#8B0000] font-bold">Very Strong</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Repository belongs to the same organization linked on the website
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-[#8B0000]">
                  +20 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-blue-800 font-bold">Medium</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Repository name strongly matches brand or project title
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-blue-800">
                  +15 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-blue-800 font-bold">Medium</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Repository description matches website meta/OpenGraph description
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-blue-800">
                  +10 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-blue-800 font-bold">Medium</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-950">
                  Detected website technologies align with repository language/topics
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-blue-800">
                  +10 pts
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700 font-bold">Weak</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">
                  Similar topic keywords or title tokens (never sufficient alone)
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-700">+5 pts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Security, SSRF Protection & Legal Transparency */}
      <section className="pt-8 border-t-2 border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed">
        <div className="p-5 card-editorial rounded-sm space-y-2">
          <h2 className="text-base font-display font-extrabold text-slate-950">
            Security &amp; SSRF Protection Policy
          </h2>
          <p className="text-slate-800 font-semibold">
            Every submitted URL undergoes strict server-side validation and DNS
            resolution prior to fetching. Requests to `localhost`, `127.0.0.1`,
            `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, IPv6 loopback/unique
            local ranges, non-standard ports, and cloud metadata endpoints
            (`169.254.169.254`) are blocked at both initial lookup and across HTTP
            redirects.
          </p>
        </div>

        <div className="p-5 card-editorial rounded-sm space-y-2">
          <h2 className="text-base font-display font-extrabold text-slate-950">
            Legal &amp; Ethical Transparency Notice
          </h2>
          <p className="text-slate-800 font-semibold">
            This tool only identifies publicly available repositories using publicly
            accessible information and GitHub&apos;s public APIs. It does not access
            private repositories or bypass authentication. Currently indexing{' '}
            <strong>{DIRECTORY_ENTRIES.length}</strong> verified websites across{' '}
            <strong>{CATEGORIES.length}</strong> categories.
          </p>
        </div>
      </section>
    </div>
  );
};
