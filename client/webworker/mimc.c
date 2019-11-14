#include <gmp.h>
#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#include "mimc_constants.h"

// this code is really horrible but it's ok bc it's only client-side so as long as it works we're good :^)

typedef struct FeistelState {
  mpz_t l, r;
} FeistelState;

void display(FeistelState * state);
void feistelInit(FeistelState * state);
void inject(FeistelState * state, mpz_t elt, mpz_t p);
void mix(FeistelState * state, mpz_t p, mpz_t * c);
void mimcHash(mpz_t res, mpz_t x, mpz_t y, mpz_t MODULUS, mpz_t * c);

int ROUNDS = 220;

int main() {
  // set up system params
  mpz_t MODULUS;
  mpz_init(MODULUS);
  mpz_set_str(MODULUS, "21888242871839275222246405745257275088548364400416034343698204186575808495617", 10);
  mpz_t * c = getMimcConstants();

  char inputStrX[1024];
  char inputStrY[1024];
  /*
     mpz_t is the type defined for GMP integers.
     It is a pointer to the internals of the GMP integer data structure
   */
  mpz_t x;
  mpz_t y;
  int flag;

  /* 1. Initialize x and y */
  mpz_init(x);
  mpz_set_ui(x, 0);
  mpz_init(y);
  mpz_set_ui(y, 0);

  printf ("Enter X: ");
  scanf("%1023s" , inputStrX); /* NOTE: never every write a call scanf ("%s", inputStr);
                                  You are leaving a security hole in your code. */
  flag = mpz_set_str(x, inputStrX, 10);
  assert (flag == 0); /* If flag is not 0 then the operation failed */

  printf ("Enter Y: ");
  scanf("%1023s" , inputStrY); /* NOTE: never every write a call scanf ("%s", inputStr);
                                  You are leaving a security hole in your code. */
  flag = mpz_set_str(y, inputStrY, 10);
  assert (flag == 0);

  mpz_t hash;
  mpz_init(hash);
  mimcHash(hash, x, y, MODULUS, c);
  mpz_out_str(stdout, 10, hash);
  printf("\n");
  
  /* 6. Clean up the mpz_t handles or else we will leak memory */
  mpz_clear(x);
  mpz_clear(y);
  mpz_clear(MODULUS);
  mpz_clear(hash);
  int i;
  for (i = 0; i < ROUNDS; i++) {
    mpz_clear(c[i]);
  }
}

void display(FeistelState * state) {
  printf("\nDisplaying Feistel Info\n");
  printf("\nstate.l:\n");
  mpz_out_str(stdout, 10, state->l);
  printf("\nstate.r:\n");
  mpz_out_str(stdout, 10, state->r);
  printf("\n");
}

void feistelInit(FeistelState * state) {
  mpz_init(state->l);
  mpz_init(state->r);
  mpz_set_ui(state->l, 0);
  mpz_set_ui(state->r, 0);
}

void inject(FeistelState * state, mpz_t elt, mpz_t p) {
  mpz_add(state->l, state->l, elt);
  mpz_mod(state->l, state->l, p);
}

void mix(FeistelState * state, mpz_t p, mpz_t * c) {
  int i;
  mpz_t mpzFive;
  mpz_init_set_ui(mpzFive, 5);
  for (i = 0; i < ROUNDS - 1; i++) {
    mpz_t t;
    mpz_init(t);
    mpz_add(t, state->l, c[i]);
    mpz_mod(t, t, p);

    mpz_t tPow5;
    mpz_init(tPow5);
    mpz_powm(tPow5, t, mpzFive, p); // don't need to use mpz_powm_sec since this is client

    mpz_t lNew;
    mpz_init(lNew);
    mpz_add(lNew, tPow5, state->r);
    mpz_mod(lNew, lNew, p);

    mpz_set(state->r, state->l);
    mpz_set(state->l, lNew);

    mpz_clear(t);
    mpz_clear(tPow5);
    mpz_clear(lNew);
  }
  mpz_t t;
  mpz_init(t);
  mpz_add(t, state->l, c[ROUNDS-1]);
  mpz_mod(t, t, p);

  mpz_t tPow5;
  mpz_init(tPow5);
  mpz_powm(tPow5, t, mpzFive, p);

  mpz_add(state->r, tPow5, state->r);
  mpz_mod(state->r, state->r, p);

  mpz_clear(t);
  mpz_clear(tPow5);
}

void mimcHash(mpz_t res, mpz_t x, mpz_t y, mpz_t MODULUS, mpz_t * c) {
  printf("\nStarting to hash...\n");
  FeistelState * s = malloc(sizeof(FeistelState));
  feistelInit(s);

  inject(s, x, MODULUS);
  mix(s, MODULUS, c);
  inject(s, y, MODULUS);
  mix(s, MODULUS, c);

  mpz_set(res, s->l);

  // free memory
  mpz_clear(s->l);
  mpz_clear(s->r);
  free(s);
}
