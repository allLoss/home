//借助栈来解释dom节点树,树遍历为左序，每个js模块对应一个dom节点，index作为首节点
import { fs_index as headNode } from "../index.js";

let stack = [];
let length = 0;

function push(node) {
    if (node === undefined) {
        console.log("节点没有定义！");
        return;
    }

    stack[length++] = node;
}
function pop() {
    return stack[length--];
}

push(headNode);

for (; ;) {
    let currentNode = pop();
    //将当前节点加载到html中

    for (i = currentNode.nodes.length - 1; i >= 0; i--) {
        push(currentNode.nodes[i]);

        if (i == 0) {
          
            tree = pop();
            //访问至叶子则停止继续往下解析
            if (currentNode.nodes === undefined || currentNode.nodes.length === undefined || currentNode.nodes.length == 0) {
                //todo....

            }
        }
    }


}
