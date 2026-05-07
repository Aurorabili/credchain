// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title Minimal Multicall3
/// @notice Aggregate multiple read calls into a single RPC request.
contract Multicall3 {
    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    function aggregate3(
        Call3[] calldata calls
    ) external payable returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; i++) {
            Call3 calldata calli = calls[i];
            (bool success, bytes memory data) = calli.target.call(calli.callData);

            if (!calli.allowFailure && !success) {
                revert("Multicall3: call failed");
            }

            returnData[i] = Result({
                success: success,
                returnData: data
            });
        }
    }
}
