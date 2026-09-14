import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../artifacts/nextrade/src/lib/app-bootstrap.ts', import.meta.url);

function loadModule() {
  return import(modulePath.href);
}

test('runtime fallback keeps a visible error message when the app mount fails', async () => {
  const { renderRuntimeFallback } = await loadModule();

  const root = { id: 'root', innerHTML: '' };
  const documentStub = {
    body: { innerHTML: '' },
    getElementById(id) {
      return id === 'root' ? root : null;
    },
  };

  const before = documentStub.body.innerHTML;
  renderRuntimeFallback({
    documentRef: documentStub,
    rootId: 'root',
    message: 'React failed to mount',
    detail: 'Refresh the page to retry',
  });

  assert.notEqual(before, documentStub.body.innerHTML);
  assert.match(documentStub.body.innerHTML, /React failed to mount/i);
  assert.match(documentStub.body.innerHTML, /Refresh the page to retry/i);
  assert.equal(root.innerHTML, '');
});
