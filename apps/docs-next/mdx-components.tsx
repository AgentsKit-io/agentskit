import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { MDXComponents } from 'mdx/types'
import { Mermaid } from '@/components/mermaid'
import { StackblitzEmbed } from '@/components/mdx/stackblitz-embed'
import { CodeSandboxEmbed } from '@/components/mdx/codesandbox-embed'
import { GifEmbed } from '@/components/mdx/gif-embed'
import { Playground } from '@/components/mdx/playground'
import { FrameworkTabs, Framework } from '@/components/mdx/framework-tabs'
import { RunCode } from '@/components/mdx/run-code'
import { ArchDiagram } from '@/components/mdx/arch-diagram'
import { Since } from '@/components/mdx/since'
import { Tip, Warning, Pitfall, Performance, Security, Info, Success, Compare } from '@/components/mdx/callouts'
import { HeadingAnchor } from '@/components/docs/heading-anchor'
import { Verified } from '@/components/mdx/verified'
import { LiveAdapter } from '@/components/mdx/live-adapter'
import { StackBuilder } from '@/components/mdx/stack-builder'
import { MigrationDiff } from '@/components/mdx/migration-diff'
import { Artifact } from '@/components/mdx/artifact'
import { LivePlayground } from '@/components/mdx/live-playground'
import { G } from '@/components/mdx/glossary'
import { VoiceMode } from '@/components/mdx/voice-mode'

type HeadingProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
>

function withAnchor(tag: 'h2' | 'h3' | 'h4') {
  const Tag = tag
  return function HeadingWithAnchor({ children, id, ...rest }: HeadingProps) {
    return (
      <Tag id={id} {...rest}>
        <HeadingAnchor id={id} />
        {children}
      </Tag>
    )
  }
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    h2: withAnchor('h2'),
    h3: withAnchor('h3'),
    h4: withAnchor('h4'),
    Mermaid,
    StackblitzEmbed,
    CodeSandboxEmbed,
    GifEmbed,
    Playground,
    FrameworkTabs,
    Framework,
    RunCode,
    ArchDiagram,
    Since,
    Tip,
    Warning,
    Pitfall,
    Performance,
    Security,
    Info,
    Success,
    Compare,
    Verified,
    LiveAdapter,
    StackBuilder,
    MigrationDiff,
    Artifact,
    LivePlayground,
    G,
    VoiceMode,
    ...components,
  }
}
