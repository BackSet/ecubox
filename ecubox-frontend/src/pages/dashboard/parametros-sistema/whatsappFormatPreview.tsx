import { Fragment, type ReactNode } from 'react';

/**
 * Convierte texto con marcadores estilo WhatsApp (*negrita*, _cursiva_, ~tachado~, `código`, bloques ```)
 * en nodos React seguros (sin HTML arbitrario del usuario).
 */
function parseInlineFragment(s: string, baseKey: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let buf = '';
  let part = 0;
  const flush = () => {
    if (buf) {
      out.push(buf);
      part += 1;
      buf = '';
    }
  };

  while (i < s.length) {
    const c = s[i];
    if (c === '`') {
      const j = s.indexOf('`', i + 1);
      if (j === -1) {
        buf += c;
        i++;
        continue;
      }
      flush();
      out.push(
        <code
          key={`${baseKey}-c-${part++}`}
          className="rounded bg-[var(--color-muted)]/60 px-1 py-0.5 font-mono text-[0.9em]"
        >
          {s.slice(i + 1, j)}
        </code>
      );
      i = j + 1;
      continue;
    }
    if (c === '*') {
      const j = s.indexOf('*', i + 1);
      if (j === -1) {
        buf += c;
        i++;
        continue;
      }
      flush();
      out.push(
        <strong key={`${baseKey}-b-${part++}`} className="font-semibold">
          {s.slice(i + 1, j)}
        </strong>
      );
      i = j + 1;
      continue;
    }
    if (c === '_') {
      const j = s.indexOf('_', i + 1);
      if (j === -1) {
        buf += c;
        i++;
        continue;
      }
      flush();
      out.push(
        <em key={`${baseKey}-e-${part++}`} className="italic">
          {s.slice(i + 1, j)}
        </em>
      );
      i = j + 1;
      continue;
    }
    if (c === '~') {
      const j = s.indexOf('~', i + 1);
      if (j === -1) {
        buf += c;
        i++;
        continue;
      }
      flush();
      out.push(
        <s key={`${baseKey}-s-${part++}`} className="line-through opacity-90">
          {s.slice(i + 1, j)}
        </s>
      );
      i = j + 1;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

function parseTextWithNewlines(s: string, baseKey: string): ReactNode {
  const lines = s.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={`${baseKey}-ln-${li}`}>
          {li > 0 ? <br /> : null}
          {parseInlineFragment(line, `${baseKey}-L${li}`)}
        </Fragment>
      ))}
    </>
  );
}

export function parseWhatsAppPreviewToReact(text: string): ReactNode {
  if (!text.trim()) return null;

  const nodes: ReactNode[] = [];
  const blockRe = /```([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let blockIdx = 0;

  while ((m = blockRe.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before) {
      nodes.push(
        <span key={`txt-${blockIdx}`} className="inline">
          {parseTextWithNewlines(before, `seg-${blockIdx}`)}
        </span>
      );
    }
    nodes.push(
      <pre
        key={`blk-${blockIdx}`}
        className="my-1 overflow-x-auto rounded-md border border-[var(--color-border)]/60 bg-[var(--color-muted)]/35 p-2 font-mono text-[13px] leading-snug whitespace-pre-wrap"
      >
        {m[1]}
      </pre>
    );
    last = blockRe.lastIndex;
    blockIdx += 1;
  }

  const rest = text.slice(last);
  if (rest) {
    nodes.push(
      <span key={`txt-${blockIdx}`} className="inline">
        {parseTextWithNewlines(rest, `seg-${blockIdx}`)}
      </span>
    );
  }

  return <>{nodes}</>;
}
