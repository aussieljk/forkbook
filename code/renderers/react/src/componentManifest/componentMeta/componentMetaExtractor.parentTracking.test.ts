import { describe, expect, it } from 'vitest';

import { dedent } from 'ts-dedent';

import { extract } from './componentMetaExtractor.test-helpers.ts';

describe('parent tracking', () => {
  it('attaches parent type info to props from named interfaces', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        interface ButtonProps {
          label: string;
        }
        export const Button = (props: ButtonProps) => <button />;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        label: {
          parent: { name: 'ButtonProps' },
        },
      },
    });
  });

  it('has no parent for props of an inline type', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        export const Button = (props: { label: string }) => <button />;
      `
    );
    expect(entry.component?.reactComponentMeta?.props.label.parent).toBeUndefined();
  });

  it('resolves parent through intersection type literals', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        type BaseProps = { loading?: boolean };
        type ButtonProps = { variant?: string } & BaseProps;
        export const Button = (props: ButtonProps) => <button />;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        loading: { parent: { name: 'BaseProps' } },
        variant: { parent: { name: 'ButtonProps' } },
      },
    });
  });

  it('resolves parent for forwardRef with polymorphic as-cast', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        type BaseProps = { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;
        type ButtonProps = { variant?: string } & BaseProps;
        type PolymorphicFC<As extends React.ElementType, P> =
          React.ForwardRefExoticComponent<P & { as?: As } & React.RefAttributes<any>>;
        export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
          (props, ref) => <button ref={ref} />
        ) as PolymorphicFC<'button', ButtonProps>;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        as: { parent: { name: 'PolymorphicFC' } },
        loading: { parent: { name: 'BaseProps' } },
        variant: { parent: { name: 'ButtonProps' } },
      },
    });
  });

  it('tracks parent through intersection types', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        interface BaseProps {
          /** Unique identifier */
          id: string;
        }
        interface StyleProps {
          /** Custom CSS class */
          className?: string;
        }
        type ButtonProps = BaseProps & StyleProps & {
          /** The label */
          label: string;
        };
        export const Button = (props: ButtonProps) => <button />;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        id: { parent: { name: 'BaseProps' } },
        className: { parent: { name: 'StyleProps' } },
        label: { parent: { name: 'ButtonProps' } },
      },
    });
  });

  it('tracks parent through extends', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        interface BaseProps {
          /** Unique identifier */
          id: string;
        }
        interface ButtonProps extends BaseProps {
          label: string;
        }
        export const Button = (props: ButtonProps) => <button />;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        id: { parent: { name: 'BaseProps' } },
        label: { parent: { name: 'ButtonProps' } },
      },
    });
  });

  it('tracks declarations from multiple sources', async () => {
    const entry = await extract(
      'Comp',
      dedent`
        import React from 'react';
        interface A { shared: string }
        interface B { shared: string }
        type Props = A & B;
        export const Comp = (props: Props) => <div />;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        shared: {
          parent: { name: 'A' },
        },
      },
    });
  });

  it('filters out HTML attributes when declaration file contributes >30 props', async () => {
    const entry = await extract(
      'Button',
      dedent`
        import React from 'react';
        interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
          /** Custom variant */
          variant: 'primary' | 'secondary';
        }
        export const Button = (props: ButtonProps) => <button />;
      `
    );
    expect(entry.component?.reactComponentMeta).toMatchObject({
      props: {
        variant: {
          parent: { name: 'ButtonProps', fileName: expect.any(String) },
        },
      },
    });
    // HTML attributes from ButtonHTMLAttributes are filtered out (>30 props)
    const propNames = Object.keys(entry.component?.reactComponentMeta?.props ?? {});
    expect(propNames).toContain('variant');
    expect(propNames).not.toContain('onClick');
    expect(propNames).not.toContain('className');
    expect(propNames).not.toContain('disabled');
  });
});
