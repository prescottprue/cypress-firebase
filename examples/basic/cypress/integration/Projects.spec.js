describe('Projects View', () => {
  describe('when authenticated', () => {
    before(() => {
      // Login using custom token
      cy.log('Calling login')
      cy.login(Cypress.env('TEST_UID'));
      // TODO: Use cy.setRtdb() to set projects created by authed user
      // cy.callFirestore('add', 'projects', { name: 'project 1'})
      // cy.callRtdb('set', 'projects/asdf123', { name: 'project 1'})
      // Go to home page
      cy.visit('/');
    });

    after(() => {
      // TODO: Use cy.setRtdb() to set projects created by authed user
      // cy.callRtdb('remove')
    })

    it('Shows projects if logged in', () => {
      cy.get('[data-test=projects]').should('exist')
    });
  })

});
