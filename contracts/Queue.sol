//from https://github.com/chriseth/solidity-examples/blob/master/queue.sol

contract queue {
    struct Queue {
        uint[] data;
        uint front;
        uint back;
    }

    function length(Queue storage q) internal view returns (uint) {
        return q.back - q.front;
    }

    function capacity(Queue storage q) internal view returns (uint) {
        return q.data.length - 1;
    }

    function push(Queue storage q, uint data) internal {
        require((q.back + 1) % q.data.length != q.front);

        q.data[q.back] = data;
        q.back = (q.back + 1) % q.data.length;
    }

    function pop(Queue storage q) internal returns (uint) {
        require(q.back != q.front);

        uint out = q.data[q.front];
        delete q.data[q.front];
        q.front = (q.front + 1) % q.data.length;
        return out;
    }
}