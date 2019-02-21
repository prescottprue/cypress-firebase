describe('Projects View', () => {

  describe('when not authenticated', () => {
    it('Shows login message and button', () => {
      cy.get('[data-test=login]').click()
    });
  })

  describe('when authenticated', () => {
    before(() => {
      // Go to home page
      cy.visit('/');
      // Login using custom token
      cy.login();
      // TODO: Use cy.setRtdb() to set projects created by authed user
      // cy.callRtdb('set', 'projects', listOfProjects)
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
