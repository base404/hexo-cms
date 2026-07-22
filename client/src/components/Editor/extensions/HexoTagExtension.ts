import { Node, mergeAttributes } from '@tiptap/core';

export interface HexoTagOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hexoTag: {
      setHexoTag: (rawTag: string) => ReturnType;
    };
  }
}

export const HexoTagExtension = Node.create<HexoTagOptions>({
  name: 'hexoTag',
  group: 'inline',
  inline: true,
  atom: true, // Treated as single indivisible block
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      rawTag: {
        default: '{% codeblock %}',
        parseHTML: (element) => element.getAttribute('data-raw-tag'),
        renderHTML: (attributes) => ({
          'data-raw-tag': attributes.rawTag,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-hexo-tag]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-hexo-tag': 'true',
        class: 'hexo-tag-block',
      }),
      `{% ${node.attrs.rawTag} %}`,
    ];
  },

  addCommands() {
    return {
      setHexoTag:
        (rawTag: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { rawTag },
          });
        },
    };
  },
});
