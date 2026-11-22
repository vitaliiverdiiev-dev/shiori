import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { KanaSelection } from './kana-selection';

function setup(script: 'hiragana' | 'katakana' = 'hiragana') {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <KanaSelection script={script} userId="alice" />
    </MemoryRouter>,
  );
  return { user };
}

const status = () => screen.getByRole('status');
const kana = (name: string) => screen.getByRole('button', { name });
const rowCheckbox = (label: string) =>
  screen.getByRole('checkbox', { name: `${label} row` });
const sectionCheckbox = (title: string) =>
  screen.getByRole('checkbox', { name: `Select all ${title}` });

describe('KanaSelection', () => {
  it('starts with nothing selected and shows every section', () => {
    setup();

    expect(status()).toHaveTextContent('0 of 104 selected');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Basic', 'Dakuten & handakuten', 'Yōon']);
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects and deselects single characters independently', async () => {
    const { user } = setup();

    await user.click(kana('し shi'));
    await user.click(kana('ち chi'));
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('2 of 104 selected');

    await user.click(kana('し shi'));
    expect(kana('し shi')).toHaveAttribute('aria-pressed', 'false');
    expect(kana('ち chi')).toHaveAttribute('aria-pressed', 'true');
    expect(status()).toHaveTextContent('1 of 104 selected');
  });

  it('shows a partly selected row as mixed and completes it on click', async () => {
    const { user } = setup();

    await user.click(kana('か ka'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'mixed');

    await user.click(rowCheckbox('か'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'true');
    const row = screen.getByRole('group', { name: 'か row' });
    for (const button of within(row).getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    expect(status()).toHaveTextContent('5 of 104 selected');

    await user.click(rowCheckbox('か'));
    expect(rowCheckbox('か')).toHaveAttribute('aria-checked', 'false');
    expect(status()).toHaveTextContent('0 of 104 selected');
  });

  it('selects a whole section and marks it mixed after one deselection', async () => {
    const { user } = setup();

    await user.click(sectionCheckbox('Yōon'));
    expect(status()).toHaveTextContent('33 of 104 selected');
    expect(rowCheckbox('きゃ')).toHaveAttribute('aria-checked', 'true');

    await user.click(kana('ぎょ gyo'));
    expect(sectionCheckbox('Yōon')).toHaveAttribute('aria-checked', 'mixed');
    expect(rowCheckbox('ぎゃ')).toHaveAttribute('aria-checked', 'mixed');
    expect(sectionCheckbox('Basic')).toHaveAttribute('aria-checked', 'false');
  });

  it('selects everything and clears the selection', async () => {
    const { user } = setup('katakana');

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect(status()).toHaveTextContent('104 of 104 selected');
    expect(kana('ン n')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Select all' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(status()).toHaveTextContent('0 of 104 selected');
    expect(kana('ン n')).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps distinct characters with a shared reading separate', async () => {
    const { user } = setup();

    await user.click(kana('じ ji'));
    expect(kana('じ ji')).toHaveAttribute('aria-pressed', 'true');
    expect(kana('ぢ ji')).toHaveAttribute('aria-pressed', 'false');
  });

  it('works from the keyboard: arrows move within a row, Space toggles', async () => {
    const { user } = setup();

    await user.click(kana('か ka'));
    await user.keyboard('{ArrowRight}');
    expect(kana('き ki')).toHaveFocus();
    await user.keyboard(' ');
    expect(kana('き ki')).toHaveAttribute('aria-pressed', 'true');

    await user.tab();
    expect(rowCheckbox('さ')).toHaveFocus();
    await user.keyboard(' ');
    expect(rowCheckbox('さ')).toHaveAttribute('aria-checked', 'true');
    expect(status()).toHaveTextContent('7 of 104 selected');
  });
});
