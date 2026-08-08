'use client'
import DottedMap from 'dotted-map'
import { Area, AreaChart, CartesianGrid } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@workspace/ui/components/chart'

export default function FeaturesSection() {
    return (
        <section
            className="overflow-hidden px-4 py-16 md:py-20"
            id="features"
        >
            <div className="mx-auto max-w-7xl px-2 lg:px-6">
                <h2 className="text-muted-foreground max-w-4xl text-balance text-4xl font-medium tracking-tight">
                    <span className="text-foreground">See every conversation.</span> <br /> Who is waiting, and on what.
                </h2>
                <div className="mt-8 grid rounded-xl border md:mt-16 md:grid-cols-2">
                    <div className="row-span-2 grid grid-rows-subgrid gap-6 md:gap-0">
                        <div className="p-6 sm:p-12">
                            <p className="text-muted-foreground text-balance text-lg font-medium">
                                <span className="text-foreground">Wherever your visitors are.</span> Lynq reads each visitor&apos;s timezone and browser, so you know who you are talking to before you reply.
                            </p>
                        </div>

                        <div
                            aria-hidden
                            className="relative"
                        >
                            <div className="absolute inset-0 z-10 m-auto size-fit -translate-y-full">
                                <div className="rounded-(--radius) text-muted-foreground z-1 ring-foreground/6.5 shadow-black/6.5 relative flex size-fit w-fit items-center gap-2 bg-zinc-900/75 px-3 py-1 text-xs font-medium shadow-lg ring backdrop-blur">
                                    <span className="text-lg">🇨🇩</span> Last connection from <span className="text-foreground">DR Congo</span>
                                </div>
                                <div className="rounded-(--radius) bg-background ring-foreground/6.5 absolute inset-2 -bottom-2 mx-auto px-3 py-4 text-xs font-medium shadow-md shadow-black/5 ring"></div>
                            </div>

                            <div className="mask-radial-at-center mask-radial-from-25% mask-radial-[50%_50%] relative overflow-hidden opacity-25">
                                <Map />
                            </div>
                        </div>
                    </div>
                    <div className="row-span-2 grid grid-rows-subgrid gap-6 overflow-hidden border-t p-6 sm:p-12 md:gap-0 md:border-0 md:border-l dark:bg-transparent">
                        <div className="relative z-10">
                            <p className="text-muted-foreground text-balance text-lg font-medium">
                                <span className="text-foreground">Your widget, your brand.</span> Colours, greeting and copy are yours, and changes apply live — nothing in it says it is not part of your product.
                            </p>
                        </div>
                        <div
                            aria-hidden
                            className="mask-radial-at-top-left mask-radial-[90%_80%] mask-radial-from-75%"
                        >
                            <div className="bg-card relative mx-auto flex aspect-video flex-col justify-between rounded-xl border pb-6">
                                <div className="mb-6 flex gap-1.5 border-b p-3">
                                    <div className="bg-foreground/10 size-1.5 rounded-full"></div>
                                    <div className="bg-foreground/10 size-1.5 rounded-full"></div>
                                    <div className="bg-foreground/10 size-1.5 rounded-full"></div>
                                </div>

                                <div className="bg-foreground/2 ring-foreground/6.5 mx-6 mt-auto h-32 rounded-xl shadow-xl ring" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-full border-y p-12 lg:py-20">
                        <p className="text-center text-4xl font-semibold lg:text-7xl">
                            One script tag. <span className="text-muted-foreground">That is the whole install.</span>
                        </p>
                    </div>
                    <div className="relative col-span-full">
                        <div className="absolute z-10 max-w-lg px-6 pr-12 pt-6 md:px-12 md:pt-12">
                            <p className="mb-8 text-balance text-lg font-medium">
                                Your inbox, updated in real time. <span className="text-muted-foreground">Watch where volume comes from and catch a backlog building before customers start chasing you. Chart shown with sample data.</span>
                            </p>
                        </div>
                        <MonitoringChart />
                    </div>
                </div>
            </div>
        </section>
    )
}

const map = new DottedMap({ height: 55, grid: 'diagonal' })

const points = map.getPoints()

const svgOptions = {
    backgroundColor: 'var(--color-background)',
    color: 'currentColor',
    radius: 0.15,
}

const Map = () => {
    const viewBox = `0 0 120 60`
    return (
        <svg
            viewBox={viewBox}
            style={{ background: svgOptions.backgroundColor }}
        >
            {points.map((point, index) => (
                <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={svgOptions.radius}
                    fill={svgOptions.color}
                />
            ))}
        </svg>
    )
}

const chartConfig = {
    desktop: {
        label: 'Web chat',
        color: '#2563eb',
    },
    mobile: {
        label: 'Telegram',
        color: '#60a5fa',
    },
} satisfies ChartConfig

const chartData = [
    { month: 'May', desktop: 56, mobile: 224 },
    { month: 'June', desktop: 56, mobile: 224 },
    { month: 'January', desktop: 126, mobile: 252 },
    { month: 'February', desktop: 205, mobile: 410 },
    { month: 'March', desktop: 200, mobile: 126 },
    { month: 'April', desktop: 400, mobile: 800 },
]

const MonitoringChart = () => {
    return (
        <ChartContainer
            className="h-120 aspect-auto md:h-96"
            config={chartConfig}
        >
            <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                    left: 0,
                    right: 0,
                }}
            >
                <defs>
                    <linearGradient
                        id="fillDesktop"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--color-desktop)"
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="55%"
                            stopColor="var(--color-desktop)"
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                    <linearGradient
                        id="fillMobile"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="var(--color-mobile)"
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="55%"
                            stopColor="var(--color-mobile)"
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <ChartTooltip
                    active
                    cursor={false}
                    content={<ChartTooltipContent className="dark:bg-muted" />}
                />
                <Area
                    strokeWidth={2}
                    dataKey="mobile"
                    type="stepBefore"
                    fill="url(#fillMobile)"
                    fillOpacity={0.1}
                    stroke="var(--color-mobile)"
                    stackId="a"
                />
                <Area
                    strokeWidth={2}
                    dataKey="desktop"
                    type="stepBefore"
                    fill="url(#fillDesktop)"
                    fillOpacity={0.1}
                    stroke="var(--color-desktop)"
                    stackId="a"
                />
            </AreaChart>
        </ChartContainer>
    )
}
