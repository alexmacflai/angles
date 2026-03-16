describe('prepareTextAnimation', () => {
  it('preserves punctuation placement around inline elements', async () => {
    const { prepareTextAnimation } = await import('../../src/lib/text-animation');

    document.body.innerHTML = `
      <div class="intro-copy">
        <p>Hello <a href="#alex">Alex</a>, and <strong>you</strong>, too.</p>
      </div>
    `;

    prepareTextAnimation(document);

    const paragraph = document.querySelector('.intro-copy p') as HTMLElement;
    const words = Array.from(paragraph.querySelectorAll<HTMLElement>('.word')).map((word) => word.textContent);

    expect(paragraph.textContent).toBe('Hello Alex, and you, too.');
    expect(words).toContain('Alex,');
    expect(words).toContain('you,');
    expect(words).not.toContain(',');
  });
});
