import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
  BlockSelectionInfo,
  CommonBlockElement,
  convertToList,
  createEvent,
} from '@blocksuite/shared';
import { BaseBlockModel, Store } from '@blocksuite/store';

const params = new URLSearchParams(location.search);
const initType = params.get('init') || 'default';

@customElement('debug-menu')
export class DebugMenu extends LitElement {
  @property()
  store!: Store;

  @state()
  connected = true;

  @state()
  canUndo = false;

  @state()
  canRedo = false;

  @state()
  canDelete = false;

  @state()
  _mode: 'page' | 'edgeless' = 'page';

  private get _selection() {
    const page = document.querySelector('default-page-block');
    if (!page) throw new Error('No page block');
    return page.selection;
  }

  private _onToggleConnection() {
    if (this.connected === true) {
      this.store.provider.disconnect();
      this.connected = false;
    } else {
      this.store.provider.connect();
      this.connected = true;
    }
  }

  private _convertToList(listType: 'bulleted' | 'numbered') {
    const selection = window.getSelection();
    const element = selection?.focusNode?.parentElement as HTMLElement;
    const block = element.closest('[data-block-id]') as CommonBlockElement;
    if (!block) return;

    const store = block.host.store as Store;
    // @ts-ignore
    const model = store.getBlockById(block.model.id) as BaseBlockModel;
    convertToList(this.store, model, listType);
  }

  private _onConvertToBulletedList() {
    this._convertToList('bulleted');
  }

  private _onConvertToNumberedList() {
    this._convertToList('numbered');
  }

  private _onDelete() {
    const selectionInfo = this._selection.selectionInfo;
    if (selectionInfo.type !== 'Block') return;

    selectionInfo.blocks.forEach(({ id }) => this.store.deleteBlockById(id));
  }

  private _onSetParagraphType(type: string) {
    const selection = window.getSelection();
    const element = selection?.focusNode?.parentElement as HTMLElement;
    const block = element.closest('paragraph-block')?.model as BaseBlockModel;

    this.store.captureSync();
    this.store.updateBlock(block, { type });
  }

  private _onSwitchMode() {
    this._mode = this._mode === 'page' ? 'edgeless' : 'page';

    const event = createEvent('affine.switch-mode', this._mode);
    window.dispatchEvent(event);
  }

  private _onAddGroup() {
    const pageId = document.querySelector('default-page-block')?.model.id;
    if (!pageId) return;

    this.store.captureSync();

    const groupId = this.store.addBlock({ flavour: 'group' }, pageId);
    this.store.addBlock({ flavour: 'paragraph' }, groupId);
  }

  private _handleDebugInit() {
    if (initType === 'list') {
      const pageId = this.store.addBlock({ flavour: 'page' });
      const groupId = this.store.addBlock({ flavour: 'group' }, pageId);
      for (let i = 0; i < 3; i++) {
        this.store.addBlock({ flavour: 'list' }, groupId);
      }
    }
  }

  firstUpdated() {
    this.store.slots.historyUpdated.on(() => {
      this.canUndo = this.store.canUndo;
      this.canRedo = this.store.canRedo;
    });

    requestAnimationFrame(() => {
      this._selection.onSelectionChange(selectionInfo => {
        this.canDelete =
          (selectionInfo as BlockSelectionInfo)?.blocks?.length !== undefined;
      });
      this._handleDebugInit();
    });
  }

  static styles = css`
    .debug-menu {
      position: fixed;
      left: 0;
      top: 0;
      width: 40px;
    }
    .debug-menu > button {
      margin-left: 2px;
      margin-top: 2px;
      width: 30px;
      height: 24px;
    }
  `;

  render() {
    return html`
      <div class="debug-menu">
        <button
          aria-label="undo"
          title="undo"
          .disabled=${!this.canUndo}
          @click=${() => this.store.undo()}
        >
          ⬅️
        </button>
        <button
          aria-label="redo"
          title="redo"
          .disabled=${!this.canRedo}
          @click=${() => this.store.redo()}
        >
          ➡️
        </button>
        <button
          aria-label="heading-1"
          title="heading-1"
          @click=${() => this._onSetParagraphType('h1')}
        >
          𝐇𝟏
        </button>
        <button
          aria-label="heading-2"
          title="heading-2"
          @click=${() => this._onSetParagraphType('h2')}
        >
          𝐇𝟐
        </button>
        <button
          aria-label="heading-3"
          title="heading-3"
          @click=${() => this._onSetParagraphType('h3')}
        >
          𝐇𝟑
        </button>
        <button
          aria-label="text"
          title="text"
          @click=${() => this._onSetParagraphType('text')}
        >
          𝐓
        </button>
        <button
          aria-label="convert to bulleted list"
          title="convert to bulleted list"
          @click=${this._onConvertToBulletedList}
        >
          *️⃣
        </button>
        <button
          aria-label="convert to numbered list"
          title="convert to numbered list"
          @click=${this._onConvertToNumberedList}
        >
          1️⃣
        </button>
        <button
          aria-label="delete"
          title="delete"
          .disabled=${!this.canDelete}
          @click=${this._onDelete}
        >
          ❌
        </button>
        <button
          aria-label=${this.connected ? 'disconnect' : 'connect'}
          title=${this.connected ? 'disconnect' : 'connect'}
          @click=${this._onToggleConnection}
        >
          ${this.connected ? '🟢' : '🔴'}
        </button>
        <button
          aria-label="switch mode"
          title="switch mode"
          @click=${this._onSwitchMode}
        >
          🔄
        </button>
        <button
          aria-label="add group"
          title="add group"
          @click=${this._onAddGroup}
        >
          🗄
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'debug-menu': DebugMenu;
  }
}