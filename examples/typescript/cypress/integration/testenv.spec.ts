describe('Typescript', () => {
  it('works', () => {
    // note TypeScript definition
    const x: number = 42
    cy.log('x value worked', x)
  })

  it('checks shape of an object', () => {
    const object: any = {
      age: 21,
      name: 'Joe',
    }
    expect(object).to.have.all.keys('name', 'age')
  })

  it('uses cy commands', () => {
    cy.wrap({}).should('deep.eq', {})
  })

  it('tests our example site', () => {
    cy.visit('https://example.cypress.io/')
    cy.get('.home-list')
      .contains('Querying')
      .click()
    cy.get('#query-btn').should('contain', 'Button')
  })

  // enable once we release updated TypeScript definitions
  it('has Cypress object type definition', () => {
    expect(Cypress.version).to.be.a('string')
  })

})
