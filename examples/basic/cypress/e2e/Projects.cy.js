describe('Projects View', () => {
  describe('when authenticated', () => {
    before(() => {
      // Use cy.setRtdb() to set projects created by authed user
      cy.callRtdb(
        'push',
        'projects',
        { name: 'project 1' },
        { withMeta: true },
      );
      cy.callRtdb(
        'push',
        'projects',
        { name: 'project 3' },
        { withMeta: true },
      );
      cy.login('abc123');
      // Go to home page
      cy.visit('/');
    });

    it('Shows projects if logged in', () => {
      cy.get('[data-test=projects]').should('exist');
    });
  });
});
