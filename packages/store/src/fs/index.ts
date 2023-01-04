import { encode, decode } from 'cbor-x';
import * as Y from 'yjs';
import { Workspace } from '../workspace/index.js';
import type { StoreOptions } from '../store.js';
import type { Buffer } from 'buffer';

export type FileData = {
  doc: Uint8Array;
  config: Pick<StoreOptions, 'room' | 'idGenerator'>;
  blobs: Uint8Array[];
};

export async function encodeWorkspace(
  workspace: Workspace
): Promise<Uint8Array> {
  const blobsStorage = await workspace.blobs;
  const blobs: Uint8Array[] = [];
  if (blobsStorage) {
    for (const id of blobsStorage.blobs) {
      const blob = await blobsStorage.getBlob(id);
      if (blob) {
        blobs.push(new Uint8Array(await blob.arrayBuffer()));
      }
    }
  }
  const docBinary = Y.encodeStateAsUpdateV2(workspace.doc);
  const fileData: FileData = {
    doc: docBinary,
    config: {
      idGenerator: workspace.options.idGenerator,
      room: workspace.options.room,
    },
    blobs,
  };
  return new Uint8Array(encode(fileData).buffer);
}

export async function decodeWorkspace(buffer: Buffer): Promise<Workspace> {
  let data!: FileData;
  try {
    data = decode(buffer);
  } catch (e) {
    console.error('cannot decode: ', e);
  }
  const workspace = new Workspace({
    room: data.config.room,
    idGenerator: data.config.idGenerator,
  });
  Y.applyUpdateV2(workspace.doc, data.doc);
  const promises: Promise<unknown>[] = [];
  await workspace.blobs.then(storage => {
    if (storage) {
      data.blobs.forEach(buffer => {
        promises.push(storage.set(new Blob([buffer])));
      });
    }
  });
  await Promise.all(promises);
  return workspace;
}