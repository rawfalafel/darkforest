#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

int int_sqrt(int x) {
  return sqrt(x);
}

char * hello(int x) {
	char * ret = calloc(x * 5 + 1, sizeof(char));
	int i;
	for (i = 0; i < x; i++) {
		strcat(ret, "Hello");
	}
	return ret;
}