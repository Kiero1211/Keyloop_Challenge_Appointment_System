using System;
using System.Diagnostics;
using System.Threading.Tasks;
using AppointmentWorkerService.Infrastructure.Bulkhead;
using Xunit;

namespace AppointmentWorkerService.Tests.Unit.Infrastructure;

public class TenantBulkheadRouterTests
{
    [Fact]
    public async Task GivenFiftyTenantA_AndOneTenantB_WhenDispatched_ThenTenantBCompletesWithin500ms()
    {
        var sut = new TenantBulkheadRouter(maxConcurrent: 5, queueCapacity: 50);
        var tcsA = new TaskCompletionSource(); // Blocks tenant A

        // Flood Tenant A
        for (int i = 0; i < 50; i++)
        {
            sut.DispatchAsync("tenant-A", () => tcsA.Task);
        }

        var sw = Stopwatch.StartNew();
        var tcsB = new TaskCompletionSource();
        
        // Tenant B should not be blocked by A
        var result = sut.DispatchAsync("tenant-B", () => 
        {
            tcsB.SetResult();
            return Task.CompletedTask;
        });

        Assert.Equal(DispatchResult.Dispatched, result);

        await Task.WhenAny(tcsB.Task, Task.Delay(500));
        
        Assert.True(tcsB.Task.IsCompleted, "Tenant B was starved by Tenant A");
        
        // Cleanup
        tcsA.SetResult();
    }

    [Fact]
    public void GivenChannelFull_WhenDispatch_ThenReturnsChannelFullResult()
    {
        var sut = new TenantBulkheadRouter(maxConcurrent: 1, queueCapacity: 1);
        var tcs = new TaskCompletionSource();

        // 1 executing
        sut.DispatchAsync("tenant-1", () => tcs.Task);
        // 1 in queue
        sut.DispatchAsync("tenant-1", () => tcs.Task);
        
        // Next should be full
        var result = sut.DispatchAsync("tenant-1", () => tcs.Task);

        Assert.Equal(DispatchResult.ChannelFull, result);
        
        tcs.SetResult();
    }

    [Fact]
    public void GivenChannelFull_WhenDispatch_ThenDoesNotBlockCaller()
    {
        var sut = new TenantBulkheadRouter(maxConcurrent: 1, queueCapacity: 1);
        var tcs = new TaskCompletionSource();

        sut.DispatchAsync("tenant-1", () => tcs.Task);
        sut.DispatchAsync("tenant-1", () => tcs.Task);
        
        var sw = Stopwatch.StartNew();
        var result = sut.DispatchAsync("tenant-1", () => tcs.Task);
        sw.Stop();

        Assert.Equal(DispatchResult.ChannelFull, result);
        Assert.True(sw.ElapsedMilliseconds < 100, "Dispatch blocked the caller");
        
        tcs.SetResult();
    }
}
