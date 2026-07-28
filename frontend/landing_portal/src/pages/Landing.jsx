import React, { useState } from 'react'
import { Heart, Shield, Mic, Globe, Zap, Hospital, FileText, Users, CheckCircle, ChevronDown, Star, ArrowRight, Phone, Brain, Activity, Map } from 'lucide-react'
import { Btn } from '../components/ui/Btn'

const features = [
  { icon: Brain, title: 'AI Health Guidance', desc: 'Get instant, accurate health advice in your language using our AI trained on WHO and ICMR guidelines.', color: '#50ABE7' },
  { icon: Mic, title: 'Voice-First Interface', desc: 'Speak naturally in Hindi, Kannada, Tamil, or 12 other regional languages — no typing needed.', color: '#7AD8FF' },
  { icon: FileText, title: 'Smart OCR Reports', desc: 'Photograph your prescriptions and reports. Our AI reads, translates, and summarizes them instantly.', color: '#10B981' },
  { icon: Globe, title: 'IVR Support', desc: 'No smartphone? Call our IVR helpline and receive AI-powered health guidance over any phone.', color: '#F59E0B' },
  { icon: Map, title: 'Nearby Hospitals', desc: 'Find PHCs, district hospitals, and specialty centers near you with real-time availability.', color: '#EF4444' },
  { icon: Shield, title: 'Privacy First', desc: 'Your health data is encrypted and stays in India. Aadhaar-verified, zero-knowledge architecture.', color: '#7C3AED' },
]

const steps = [
  { num: '01', title: 'Register with Aadhaar or Phone', desc: 'Quick 2-minute setup with OTP verification. No paper forms.' },
  { num: '02', title: 'Describe your health concern', desc: 'Type or speak — in any language. Our AI understands medical context.' },
  { num: '03', title: 'Get AI-powered guidance', desc: 'Receive evidence-based advice, nearest hospital, and a doctor summary.' },
  { num: '04', title: 'Visit the hospital seamlessly', desc: 'Your AI summary arrives at the hospital before you do.' },
]

const testimonials = [
  { name: 'Sunita Devi', role: 'Patient, Rajasthan', text: '"Maine Hindi mein baat ki aur doctor ne sab samaj liya. Pehli baar aisa hua."', rating: 5 },
  { name: 'Dr. Arjun Nair', role: 'Government Hospital, Kerala', text: '"Sahyog has cut our intake paperwork by 70%. Patients arrive with complete histories."', rating: 5 },
  { name: 'Kavitha R.', role: 'ANM, Karnataka', text: '"Voice input means even illiterate patients can use this. It\'s truly for everyone."', rating: 5 },
]

const faqs = [
  { q: 'Is Sahyog free for patients?', a: 'Yes. Sahyog is a government initiative. All patient features are completely free.' },
  { q: 'Which languages are supported?', a: 'Hindi, English, Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam, Punjabi, Odia, Assamese, and Urdu.' },
  { q: 'How is my health data protected?', a: 'All data is stored on Indian government servers, encrypted end-to-end, and never sold. You control your data.' },
  { q: 'Can I use it without internet?', a: 'Yes — our IVR helpline works on any phone call. The app also caches recent data for offline access.' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  const handleNavigate = (path) => {
    if (path.startsWith('/hospital/')) {
      window.location.href = 'http://localhost:5175/employee-login'
    } else {
      // Patient Portal redirection to port 5176
      window.location.href = 'http://localhost:5176/login'
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl ai-gradient flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[#1E293B] text-lg">Sahyog</span>
            <span className="hidden sm:block text-xs text-[#64748B] border-l border-[#E5E7EB] pl-3">AI Healthcare Platform</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#64748B] font-medium">
            <a href="#features" className="hover:text-[#50ABE7] transition-colors">Features</a>
            <a href="#how" className="hover:text-[#50ABE7] transition-colors">How it works</a>
            <a href="#hospitals" className="hover:text-[#50ABE7] transition-colors">For Hospitals</a>
          </div>
          <div className="flex items-center gap-3">
            <Btn variant="ghost" size="sm" onClick={() => handleNavigate('/hospital/login')}>Hospital Login</Btn>
            <Btn size="sm" onClick={() => handleNavigate('/login')}>Get Started</Btn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#EDF7FF] via-white to-[#F8FAFC]" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-[#50ABE7]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-[#7AD8FF]/15 rounded-full blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#EDF7FF] text-[#50ABE7] px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <Zap className="w-3.5 h-3.5" />
                Government of India Initiative
              </div>
              <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-[#1E293B] leading-none mb-6">
                AI POWERED<br />
                <span className="ai-gradient-text">HEALTHCARE</span><br />
                FOR EVERYONE
              </h1>
              <p className="text-lg text-[#64748B] leading-relaxed mb-10 max-w-lg">
                Sahyog connects 1.4 billion Indians to intelligent health guidance — in their language, on any device, from anywhere. Voice-first. AI-powered. Free forever.
              </p>
              <div className="flex flex-wrap gap-4">
                <Btn size="xl" onClick={() => handleNavigate('/login')} icon={<ArrowRight className="w-5 h-5" />}>
                  Get Started Free
                </Btn>
                <Btn variant="outlined" size="xl" onClick={() => handleNavigate('/hospital/login')}>
                  Hospital Login
                </Btn>
              </div>
              <div className="flex items-center gap-8 mt-10 text-sm text-[#64748B]">
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> Free for patients</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> 14 languages</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> Works offline</div>
              </div>
            </div>

            {/* Right — Hero illustration card */}
            <div className="relative flex justify-center lg:justify-end animate-float">
              <div className="relative w-80 md:w-96">
                {/* Main card */}
                <div className="rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(80,171,231,0.2)]">
                  <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=700&fit=crop&auto=format"
                    alt="Doctor consulting patient with AI assistance"
                    className="w-full h-80 object-cover"
                  />
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl ai-gradient flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1E293B]">AI Health Assistant</p>
                        <p className="text-xs text-[#10B981] font-semibold">● Online now</p>
                      </div>
                    </div>
                    <div className="bg-[#EDF7FF] rounded-xl p-3 text-sm text-[#1E293B]">
                      "मुझे सिर दर्द हो रहा है और बुखार भी है। क्या करूं?"
                    </div>
                    <div className="mt-2 bg-[#F0FFF4] rounded-xl p-3 text-sm text-[#064E3B]">
                      Sounds like you may have a viral fever. Stay hydrated, rest, and take paracetamol 500mg. If temperature exceeds 103°F, visit a PHC immediately. <span className="text-[#50ABE7] font-semibold">Nearest clinic: 1.2 km →</span>
                    </div>
                  </div>
                </div>

                {/* Float cards */}
                <div className="absolute -top-4 -left-8 glass rounded-2xl p-3 shadow-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1E293B]">12,847</p>
                    <p className="text-xs text-[#64748B]">Consultations today</p>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-8 glass rounded-2xl p-3 shadow-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF7FF] flex items-center justify-center">
                    <Globe className="w-4 h-4 text-[#50ABE7]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1E293B]">14 Languages</p>
                    <p className="text-xs text-[#64748B]">Supported</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { n: '2.4M+', l: 'Patients Registered' },
              { n: '18,000+', l: 'Government Hospitals' },
              { n: '94.3%', l: 'AI Accuracy Rate' },
              { n: '28 States', l: 'Coverage' },
            ].map(s => (
              <div key={s.l}>
                <div className="font-display text-5xl text-[#50ABE7] mb-2">{s.n}</div>
                <div className="text-sm text-[#94A3B8] font-medium">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#50ABE7] font-semibold text-sm mb-3">INTELLIGENT FEATURES</p>
            <h2 className="font-display text-5xl md:text-6xl text-[#1E293B] mb-4">BUILT FOR BHARAT</h2>
            <p className="text-[#64748B] text-lg max-w-2xl mx-auto">Every feature is designed for real India — where connectivity is spotty, languages are many, and healthcare is complex.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-[#E5E7EB] card-hover">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: f.color + '18' }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-bold text-[#1E293B] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#50ABE7] font-semibold text-sm mb-3">SIMPLE PROCESS</p>
            <h2 className="font-display text-5xl md:text-6xl text-[#1E293B] mb-4">HOW IT WORKS</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#50ABE7] to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="font-display text-6xl text-[#50ABE7]/20 mb-3">{s.num}</div>
                  <h3 className="font-bold text-[#1E293B] mb-2">{s.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Guidance showcase */}
      <section className="py-24 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#7AD8FF] font-semibold text-sm mb-3">POWERED BY QWEN + RAG</p>
              <h2 className="font-display text-5xl text-white mb-6">AI THAT UNDERSTANDS MEDICAL CONTEXT</h2>
              <p className="text-[#94A3B8] leading-relaxed mb-8">
                Our AI is trained on WHO guidelines, ICMR protocols, and Indian government health standards. It understands regional disease patterns and seasonal health risks across all states.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Brain, label: 'Qwen 2.5 Model' },
                  { icon: FileText, label: 'RAG Knowledge Base' },
                  { icon: Globe, label: '14 Languages' },
                  { icon: Mic, label: 'Voice + Text' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-[#50ABE7]/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-[#7AD8FF]" />
                    </div>
                    <span className="text-sm text-white font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=500&fit=crop&auto=format"
                alt="AI healthcare technology"
                className="rounded-3xl w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Hospitals */}
      <section id="hospitals" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#50ABE7] font-semibold text-sm mb-3">FOR HEALTHCARE PROVIDERS</p>
            <h2 className="font-display text-5xl text-[#1E293B] mb-4">SMARTER HOSPITALS</h2>
            <p className="text-[#64748B] text-lg max-w-2xl mx-auto">Government hospitals, PHCs, and district hospitals get a powerful digital backbone — at zero cost.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Hospital, title: 'Hospital Dashboard', desc: 'Real-time patient flow, bed availability, staff management, and emergency alerts in one place.', img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=250&fit=crop&auto=format' },
              { icon: Users, title: 'Doctor Workspace', desc: 'AI-assisted diagnosis suggestions, voice-to-prescription entry, and complete patient history at a glance.', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=250&fit=crop&auto=format' },
              { icon: Activity, title: 'Government Analytics', desc: 'District-level health trends, outbreak detection, and resource allocation insights for administrators.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop&auto=format' },
            ].map(h => (
              <div key={h.title} className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] card-hover">
                <img src={h.img} alt={h.title} className="w-full h-44 object-cover" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <h.icon className="w-4 h-4 text-[#50ABE7]" />
                    <h3 className="font-bold text-[#1E293B]">{h.title}</h3>
                  </div>
                  <p className="text-sm text-[#64748B] leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Btn size="lg" onClick={() => handleNavigate('/hospital/login')}>Onboard Your Hospital</Btn>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#50ABE7] font-semibold text-sm mb-3">REAL VOICES</p>
            <h2 className="font-display text-5xl text-[#1E293B] mb-4">INDIA IS TALKING</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E5E7EB]">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[#1E293B] leading-relaxed mb-4 text-sm">{t.text}</p>
                <div>
                  <p className="font-bold text-sm text-[#1E293B]">{t.name}</p>
                  <p className="text-xs text-[#64748B]">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl text-[#1E293B] mb-4">COMMON QUESTIONS</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-[#1E293B]">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#64748B] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-[#64748B] leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 ai-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-6xl text-white mb-6">START YOUR HEALTH JOURNEY TODAY</h2>
          <p className="text-white/80 text-lg mb-10">Free for every Indian. Available in 14 languages. Works on any device.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Btn variant="secondary" size="xl" onClick={() => handleNavigate('/login')}>Get Started as Patient</Btn>
            <Btn className="!bg-white/20 !text-white border-2 border-white hover:!bg-white/30" size="xl" onClick={() => handleNavigate('/hospital/login')}>Hospital Registration</Btn>
          </div>
          <div className="flex justify-center items-center gap-6 mt-10 text-white/70 text-sm">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> IVR: 1800-SAHYOG</div>
            <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> sahyog.gov.in</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E293B] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl ai-gradient flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">Sahyog</span>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">An initiative of the Ministry of Health and Family Welfare, Government of India.</p>
            </div>
            {[
              { title: 'For Patients', links: ['Register', 'AI Guidance', 'Find Hospitals', 'Emergency'] },
              { title: 'For Hospitals', links: ['Onboard Hospital', 'Doctor Login', 'Admin Portal', 'Analytics'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-[#64748B] text-sm hover:text-[#50ABE7] transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#334155] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#64748B]">© 2025 Sahyog. Government of India. All rights reserved.</p>
            <div className="flex gap-4 text-xs text-[#64748B]">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
