mimc_function.o: mimc_function.c
	emcc mimc_function.c bn.c -o mimc_function.js -s EXPORTED_FUNCTIONS=["_mimcHash"] -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]'
clean:
	rm mimc_function.js mimc_function.wasm