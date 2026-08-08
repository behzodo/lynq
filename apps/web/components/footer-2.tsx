import Link from 'next/link'
import { Logo } from '@/components/logo'

const footerLinks = [
    {
        name: 'Product',
        links: [
            { href: '#features', label: 'Features' },
            { href: '#channels', label: 'Channels' },
            { href: '#pricing', label: 'Pricing' },
            { href: '/integrations', label: 'Docs' },
        ],
    },
    {
        name: 'Get started',
        links: [
            { href: '/sign-up', label: 'Create an account' },
            { href: '/sign-in', label: 'Sign in' },
            { href: '/integrations', label: 'Install the widget' },
        ],
    },
]

export default function Footer() {
    return (
        <footer>
            <div className="mx-auto max-w-7xl space-y-16 px-6 pb-6 pt-32">
                <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:grid-cols-4 lg:grid-cols-6">
                    <div className="col-span-full lg:col-span-3">
                        <Link
                            href="/"
                            aria-label="go home"
                        >
                            <Logo uniColor />
                        </Link>
                    </div>

                    {footerLinks.map((linksGroup, index) => (
                        <div key={index}>
                            <span className="text-foreground text-sm">{linksGroup.name}</span>
                            <ul className="mt-4 list-inside space-y-4">
                                {linksGroup.links.map((link, index) => (
                                    <li key={index}>
                                        <Link
                                            href={link.href}
                                            className="hover:text-primary text-muted-foreground text-sm duration-150"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-24 grid gap-x-3 gap-y-6 border-t pt-6 sm:grid-cols-2">
                    <p className="text-muted-foreground text-sm">Customer support that lives on your site.</p>
                    <span className="text-muted-foreground block text-sm sm:text-right">&copy; {new Date().getFullYear()} Lynq</span>
                </div>
            </div>
        </footer>
    )
}
