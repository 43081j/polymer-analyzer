/**
 * @polymerMixin
 */
class TestMixin extends superclass {
  static get properties() {
    return {
      foo: {
        notify: true,
        type: String,
      },
    };
  }
}
