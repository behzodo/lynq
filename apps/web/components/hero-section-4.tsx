import { HeroHeader } from '@/components/hero-section-4-header'

import { ArrowUp, Paperclip, Smile } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import LogoCloud from '@/components/hero-section-4-logo-cloud'
import Image from 'next/image'
import Link from 'next/link'

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="@container overflow-x-hidden">
                <section>
                    <div className="pt-32 lg:pt-16">
                        <div className="relative mx-auto grid max-w-7xl items-center px-6 md:grid-cols-2 md:gap-12">
                            <div className="text-center md:text-left">
                                <h1 className="mb-6 text-balance text-5xl font-medium tracking-tight">Customer support that lives on your site</h1>
                                <p className="text-muted-foreground mb-10 text-balance text-lg">One script tag puts a chat widget on your product. Every message — web or Telegram — lands in one inbox, and the ones that matter become tickets your team can track.</p>

                                <div className="flex gap-2 max-md:justify-center">
                                    <Button asChild>
                                        <Link href="/sign-up">Start for free</Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="hover:bg-transparent"
                                    >
                                        <Link href="/integrations">Read the docs</Link>
                                    </Button>
                                </div>
                            </div>
                            <div className="h-100 md:h-180 relative flex items-center">
                                <div className="absolute inset-0 z-10 m-auto h-fit md:-translate-y-7 md:px-12">
                                    <div className="relative">
                                        <div
                                            aria-hidden
                                            className="bg-card ring-foreground/15 mt-auto h-fit rounded-3xl p-3 shadow-xl shadow-black/25 ring"
                                        >
                                            <div className="text-muted-foreground p-2 pb-3 text-sm">Hey — my last invoice charged twice?</div>
                                            <div className="flex justify-between gap-3">
                                                <div className="flex items-center gap-1">
                                                    <div className="hover:bg-muted flex size-7 rounded-full *:m-auto *:size-4">
                                                        <Paperclip />
                                                    </div>
                                                    <div className="hover:bg-muted flex size-7 rounded-full *:m-auto *:size-4">
                                                        <Smile />
                                                    </div>
                                                </div>

                                                <div className="bg-foreground text-background flex size-7 rounded-full *:m-auto *:size-4">
                                                    <ArrowUp />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Image
                                    src="https://images.unsplash.com/photo-1618003787019-95b65cc875d2?q=80&w=2148&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                    alt=""
                                    className="mask-b-from-65% size-full scale-90 object-cover object-[25%_50%] mix-blend-lighten"
                                    width={2148}
                                    height={1611}
                                    sizes="(max-width: 768px) 100vw, 720px"
                                />
                            </div>
                        </div>
                    </div>
                </section>
                <LogoCloud />
            </main>
        </>
    )
}
