import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import style from 'quill/dist/quill.snow.css';

// // @ts-ignore
// import SnowTheme from 'quill-themes-snow';
// // @ts-ignore
// import QuillToolbar from 'quill-toolbar';
// import style from 'quill.snow.css';

import type { BlockHost } from '@blocksuite/shared';
import type { BaseBlockModel } from '@blocksuite/store';
import type { ListBlockModel, ParagraphBlockModel } from '../..';
import { createKeyboardBindings } from './keyboard';

Quill.register('modules/cursors', QuillCursors);
// Quill.register('modules/toolbar', QuillToolbar);
// Quill.register('themes/snow', SnowTheme);

@customElement('rich-text')
export class RichText extends LitElement {
  @query('.affine-rich-text.quill-container')
  private _textContainer!: HTMLDivElement;
  private _quill?: Quill;

  @property()
  host!: BlockHost;

  @property()
  model!: BaseBlockModel;

  // disable shadow DOM to workaround quill
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    const { host, model, _textContainer } = this;
    const { store, selection } = host;
    const keyboardBindings = createKeyboardBindings(store, model, selection);

    this._quill = new Quill(_textContainer, {
      modules: {
        cursors: true,
        toolbar: false,
        history: {
          maxStack: 0,
          userOnly: true,
        },
        keyboard: {
          bindings: keyboardBindings,
        },
      },
      theme: 'snow',
    });
    store.attachRichText(model.id, this._quill);
    store.awareness.updateLocalCursor();

    this.model.propsUpdated.on(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.host.store.detachRichText(this.model.id);

    super.disconnectedCallback();
  }

  render() {
    const { type } = this.model as ParagraphBlockModel | ListBlockModel;

    return html`
      <style>
        ${style} .affine-rich-text.quill-container {
          margin-bottom: 0px;
        }
        .ql-editor {
          padding: 2px;
        }
        .affine-rich-text.quill-container.ql-snow {
          /* border: 0; */
          border: 1px #eee dashed;
        }
        .affine-rich-text.quill-container.h1 p {
          font-size: 28px;
        }
        .affine-rich-text.quill-container.h2 p {
          font-size: 24px;
        }
        .affine-rich-text.quill-container.h3 p {
          font-size: 20px;
        }
        .affine-rich-text.quill-container.quote p {
          font-size: 13px;
          color: grey;
        }
        .affine-rich-text.quill-container.text p {
          font-size: 13px;
        }
      </style>
      <div
        class="affine-rich-text quill-container ql-container ql-snow ${type}"
      ></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'rich-text': RichText;
  }
}
