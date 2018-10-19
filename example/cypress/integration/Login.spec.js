describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('Goes to login page', () => {
    cy.url().should('include', 'login');
    // cy.get('[data-test=sign-in]').click();
    // cy.get('[data-test=google-auth-button]').should('exist');
  });
});
